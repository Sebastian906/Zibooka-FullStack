import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';
import { ProductService } from 'src/products/product.service';

@Injectable()
export class ReservationService {
    constructor(
        @InjectModel(Reservation.name)
        private reservationModel: Model<ReservationDocument>,
        private productService: ProductService,
    ) { }

    /**
     * QUEUE (FIFO) - Agrega usuario a lista de espera (Enqueue)
     * Solo se puede encolar si el libro tiene stock cero
     * 
     * @param userId - ID del usuario
     * @param bookId - ID del libro
     * @returns Reservación creada
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

            // Crear reservación (agregar al final de la cola)
            const reservation = await this.reservationModel.create({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                priority: currentQueueSize + 1,
                status: 'pending',
                requestDate: new Date(),
            });

            console.log(`[ReservationService] User enqueued at position ${reservation.priority} for book ${bookId}`);

            return reservation;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * QUEUE (FIFO) - Obtiene el siguiente en la cola (Front/Peek)
     * 
     * @param bookId - ID del libro
     * @returns Primera reservación pendiente o null
     */
    async getNextPendingReservation(bookId: string): Promise<Reservation | null> {
        try {
            const reservation = await this.reservationModel
                .findOne({
                    bookId: new Types.ObjectId(bookId),
                    status: 'pending'
                })
                .sort({ priority: 1 }) // Menor prioridad primero (FIFO)
                .populate('userId')
                .populate('bookId')
                .exec();

            return reservation;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * QUEUE (FIFO) - Procesa la siguiente reservación (Dequeue)
     * Marca como cumplida y asigna el libro al usuario
     * 
     * @param reservationId - ID de la reservación
     * @returns Reservación actualizada
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

            // Marcar como cumplida
            reservation.status = 'fulfilled';
            reservation.fulfilledAt = new Date();
            reservation.notifiedAt = new Date();

            await reservation.save();

            // Reajustar prioridades de las reservas restantes
            await this.reorderQueue(reservation.bookId.toString());

            console.log(`[ReservationService] Reservation fulfilled (dequeued): ${reservationId}`);

            return reservation;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene toda la cola de espera para un libro
     * 
     * @param bookId - ID del libro
     * @returns Array de reservaciones ordenadas por prioridad (FIFO)
     */
    async getWaitingList(bookId: string): Promise<Reservation[]> {
        try {
            const waitingList = await this.reservationModel
                .find({
                    bookId: new Types.ObjectId(bookId),
                    status: 'pending'
                })
                .sort({ priority: 1 }) // Orden FIFO
                .populate('userId')
                .exec();

            console.log(`[ReservationService] Waiting list for book ${bookId}: ${waitingList.length} reservations`);

            return waitingList;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Cancela una reservación y reordena la cola
     * 
     * @param reservationId - ID de la reservación
     * @returns Reservación cancelada
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

            // Reajustar prioridades
            await this.reorderQueue(reservation.bookId.toString());

            console.log(`[ReservationService] Reservation cancelled: ${reservationId}`);

            return reservation;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Reordena la cola después de cumplir o cancelar una reservación
     * Mantiene el orden FIFO ajustando las prioridades
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

            // Reajustar prioridades secuencialmente
            for (let i = 0; i < pendingReservations.length; i++) {
                pendingReservations[i].priority = i + 1;
                await pendingReservations[i].save();
            }

            console.log(`[ReservationService] Queue reordered for book ${bookId}: ${pendingReservations.length} reservations`);
        } catch (error) {
            console.error('[ReservationService] Error reordering queue:', error);
        }
    }

    /**
     * Marca reservaciones expiradas
     * Ejecutar periódicamente (cron job)
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

            console.log(`[ReservationService] Expired ${result.modifiedCount} old reservations`);

            return result.modifiedCount;
        } catch (error) {
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
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene la lista completa de reservas de un usuario con detalles del libro
     * @param userId - ID del usuario
     * @returns Array de reservaciones con información completa
     */
    async getUserReservationList(userId: string): Promise<Reservation[]> {
        try {
            const reservations = await this.reservationModel
                .find({ userId: new Types.ObjectId(userId) })
                .populate('bookId')
                .sort({ requestDate: -1 })
                .exec();

            console.log(`[ReservationService] Retrieved ${reservations.length} reservations for user ${userId}`);
            return reservations;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}