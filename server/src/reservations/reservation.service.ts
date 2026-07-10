import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';
import { ProductService } from 'src/products/product.service';
import { PredictionClient } from 'src/prediction/prediction-client.service';

@Injectable()
export class ReservationService {
    private readonly logger = new Logger(ReservationService.name);

    constructor(
        @InjectModel(Reservation.name)
        private reservationModel: Model<ReservationDocument>,
        private productService: ProductService,
        private predictionClient: PredictionClient,
    ) { }

    /**
     * QUEUE (FIFO) - Agrega usuario a lista de espera (Enqueue)
     * Solo se puede encolar si el libro tiene stock cero
     * 
     * @param userId - ID del usuario
     * @param bookId - ID del libro
     * @returns Reservación creada con estimatedWaitDays (si el modelo está disponible)
     */
    async addToWaitingList(userId: string, bookId: string): Promise<Reservation> {
        try {
            // Verificar que el libro existe
            const product = await this.productService.getSingleProduct(bookId);

            // VALIDACIÓN: Solo se puede reservar si stock = 0
            if (product.inStock) {
                throw new BadRequestException(
                    'Cannot create reservation. Book is currently in stock. Please purchase or loan directly.'
                );
            }

            // Verificar si el usuario ya tiene una reserva pendiente para este libro
            const existingReservation = await this.reservationModel.findOne({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                status: 'pending'
            });

            if (existingReservation) {
                throw new BadRequestException('You already have a pending reservation for this book');
            }

            // Calcular prioridad (siguiente en la cola)
            const currentQueueSize = await this.reservationModel.countDocuments({
                bookId: new Types.ObjectId(bookId),
                status: 'pending'
            });

            const priority = currentQueueSize + 1;

            // Estimar tiempo de espera (best-effort: si falla, se crea sin estimación)
            let estimatedWaitDays: number | null = null;
            try {
                const prediction = await this.predictionClient.estimateWaitTime(
                    bookId,
                    priority,
                );
                if (prediction) {
                    estimatedWaitDays = prediction.estimated_days;
                    this.logger.log(
                        `Wait time estimated for book ${bookId}: ~${estimatedWaitDays} days (confidence: ${prediction.confidence})`,
                    );
                }
            } catch (error: any) {
                this.logger.warn(
                    `Could not estimate wait time for book ${bookId}: ${error.message}`,
                );
            }

            // Crear reservación (agregar al final de la cola)
            const reservation = await this.reservationModel.create({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                priority,
                status: 'pending',
                requestDate: new Date(),
                estimatedWaitDays,
            });

            this.logger.log(
                `User enqueued at position ${priority} for book ${bookId}` +
                (estimatedWaitDays !== null ? ` (est. wait: ~${estimatedWaitDays} days)` : ''),
            );

            return reservation;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * QUEUE (FIFO) - Obtiene el siguiente en la cola (Front/Peek)
     */
    async getNextPendingReservation(bookId: string): Promise<Reservation | null> {
        try {
            const reservation = await this.reservationModel
                .findOne({
                    bookId: new Types.ObjectId(bookId),
                    status: 'pending'
                })
                .sort({ priority: 1 })
                .populate('userId')
                .populate('bookId')
                .exec();

            return reservation;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * QUEUE (FIFO) - Procesa la siguiente reservación (Dequeue)
     */
    async fulfillReservation(reservationId: string): Promise<Reservation> {
        try {
            const reservation = await this.reservationModel
                .findById(reservationId)
                .populate('bookId')
                .exec();

            if (!reservation) {
                throw new BadRequestException('Reservation not found');
            }

            if (reservation.status !== 'pending') {
                throw new BadRequestException('Reservation is not pending');
            }

            reservation.status = 'fulfilled';
            reservation.fulfilledAt = new Date();
            reservation.notifiedAt = new Date();

            await reservation.save();

            await this.reorderQueue(reservation.bookId.toString());

            this.logger.log(`Reservation fulfilled (dequeued): ${reservationId}`);

            return reservation;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene toda la cola de espera para un libro
     */
    async getWaitingList(bookId: string): Promise<Reservation[]> {
        try {
            const waitingList = await this.reservationModel
                .find({
                    bookId: new Types.ObjectId(bookId),
                    status: 'pending'
                })
                .sort({ priority: 1 })
                .populate('userId')
                .exec();

            this.logger.log(`Waiting list for book ${bookId}: ${waitingList.length} reservations`);

            return waitingList;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Cancela una reservación y reordena la cola
     */
    async cancelReservation(reservationId: string): Promise<Reservation> {
        try {
            const reservation = await this.reservationModel.findById(reservationId);

            if (!reservation) {
                throw new BadRequestException('Reservation not found');
            }

            if (reservation.status !== 'pending') {
                throw new BadRequestException('Only pending reservations can be cancelled');
            }

            reservation.status = 'cancelled';
            await reservation.save();

            await this.reorderQueue(reservation.bookId.toString());

            this.logger.log(`Reservation cancelled: ${reservationId}`);

            return reservation;
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Reordena la cola después de cumplir o cancelar una reservación
     */
    private async reorderQueue(bookId: string): Promise<void> {
        try {
            const pendingReservations = await this.reservationModel
                .find({
                    bookId: new Types.ObjectId(bookId),
                    status: 'pending'
                })
                .sort({ priority: 1 })
                .exec();

            for (let i = 0; i < pendingReservations.length; i++) {
                pendingReservations[i].priority = i + 1;
                await pendingReservations[i].save();
            }

            this.logger.log(`Queue reordered for book ${bookId}: ${pendingReservations.length} reservations`);
        } catch (error: any) {
            this.logger.error(`Error reordering queue: ${error.message}`);
        }
    }

    /**
     * Marca reservaciones expiradas
     */
    async expireOldReservations(): Promise<number> {
        try {
            const now = new Date();

            const result = await this.reservationModel.updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lt: now }
                },
                {
                    status: 'expired'
                }
            );

            this.logger.log(`Expired ${result.modifiedCount} old reservations`);

            return result.modifiedCount;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene estadísticas de reservaciones de un usuario
     */
    async getUserReservationStats(userId: string): Promise<{
        total: number;
        pending: number;
        fulfilled: number;
        cancelled: number;
        expired: number;
    }> {
        try {
            const reservations = await this.reservationModel
                .find({ userId: new Types.ObjectId(userId) })
                .exec();

            return {
                total: reservations.length,
                pending: reservations.filter(r => r.status === 'pending').length,
                fulfilled: reservations.filter(r => r.status === 'fulfilled').length,
                cancelled: reservations.filter(r => r.status === 'cancelled').length,
                expired: reservations.filter(r => r.status === 'expired').length,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene la lista completa de reservas de un usuario con detalles del libro
     */
    async getUserReservationList(userId: string): Promise<Reservation[]> {
        try {
            const reservations = await this.reservationModel
                .find({ userId: new Types.ObjectId(userId) })
                .populate('bookId')
                .sort({ requestDate: -1 })
                .exec();

            this.logger.log(`Retrieved ${reservations.length} reservations for user ${userId}`);
            return reservations;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }
}