import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';
import { Loan, LoanDocument } from 'src/loans/schemas/loan.schema';
import { ProductService } from 'src/products/product.service';
import { PredictionClient } from 'src/prediction/prediction-client.service';
import { PaginatedResult, PaginationDto } from 'src/common/dto/pagination.dto';

/**
 * Interfaz para los datos de historial de préstamos del usuario.
 */
interface UserLoanHistory {
    userId: string;
    puntualidadPromedio: number; // 0 a 1 (1 = siempre a tiempo)
    tasaDevTardias: number;      // 0 a 1 (1 = todas las devoluciones fueron tardías)
}

/**
 * Interfaz para una entrada del caché de scoring de usuario.
 */
interface ScoreCacheEntry {
    puntualidadPromedio: number;
    tasaDevTardias: number;
    expiresAt: Date;
}

/**
 * Interfaz para el desglose del scoring.
 */
interface ScoreBreakdown {
    total: number;
    positionScore: number;
    punctualityScore: number;
    waitScore: number;
    penaltyScore: number;
}

/**
 * Interfaz para el resultado de scoring de una reserva.
 */
interface ScoredReservation {
    reservation: ReservationDocument;
    score: number;
    breakdown: ScoreBreakdown;
}

@Injectable()
export class ReservationService {
    private readonly logger = new Logger(ReservationService.name);

    // Cache de historial de usuarios: userId -> ScoreCacheEntry (con TTL de 5 min)
    private scoreCache = new Map<string, ScoreCacheEntry>();

    // Pesos configurables (default: 0.4, 0.3, 0.2, 0.1)
    private readonly ALPHA: number;
    private readonly BETA: number;
    private readonly GAMMA: number;
    private readonly DELTA: number;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

    constructor(
        @InjectModel(Reservation.name)
        private reservationModel: Model<ReservationDocument>,
        @InjectModel(Loan.name)
        private loanModel: Model<LoanDocument>,
        private productService: ProductService,
        private predictionClient: PredictionClient,
    ) {
        this.ALPHA = parseFloat(process.env.RESERVATION_SCORE_ALPHA || '0.4');
        this.BETA = parseFloat(process.env.RESERVATION_SCORE_BETA || '0.3');
        this.GAMMA = parseFloat(process.env.RESERVATION_SCORE_GAMMA || '0.2');
        this.DELTA = parseFloat(process.env.RESERVATION_SCORE_DELTA || '0.1');

        if ([this.ALPHA, this.BETA, this.GAMMA, this.DELTA].some(Number.isNaN)) {
            this.logger.warn(
                '[ReservationService] One or more scoring weights are NaN, falling back to defaults',
            );
            this.ALPHA = 0.4;
            this.BETA = 0.3;
            this.GAMMA = 0.2;
            this.DELTA = 0.1;
        }

        const total = this.ALPHA + this.BETA + this.GAMMA + this.DELTA;
        if (Math.abs(total - 1.0) > 0.01) {
            this.logger.warn(
                `[ReservationService] Los pesos de scoring suman ${total.toFixed(4)}, se esperaba ~1.0`,
            );
        }

        this.logger.log(
            `ReservationService initialized with scoring weights: ` +
            `α=${this.ALPHA}, β=${this.BETA}, γ=${this.GAMMA}, δ=${this.DELTA}`,
        );
    }

    /**
     * QUEUE (FIFO) - Agrega usuario a lista de espera (Enqueue)
     * Solo se puede encolar si el libro tiene stock cero
     * 
     * @param userId - ID del usuario
     * @param bookId - ID del libro
     * @returns Reservación creada con estimatedWaitDays (si el modelo está disponible)
     */
    async addToWaitingList(userId: string, bookId: string): Promise<ReservationDocument> {
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
                const prediction = await this.predictionClient.estimateWaitTime(bookId, priority);
                if (prediction) {
                    estimatedWaitDays = prediction.estimated_days;
                    this.logger.log(
                        `Wait time estimated for book ${bookId}: ~${estimatedWaitDays} days (confidence: ${prediction.confidence})`,
                    );
                }
            } catch (error: any) {
                this.logger.warn(`Could not estimate wait time for book ${bookId}: ${error.message}`);
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
     * @deprecated Usar fulfillReservation(bookId) que selecciona automáticamente
     * el mejor candidato según scoring compuesto.
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
     * Obtiene toda la cola de espera para un libro
     */
    async getWaitingList(bookId: string, pagination: PaginationDto = {}): Promise<PaginatedResult<Reservation>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const skip = (page - 1) * limit;
            const filter = {
                bookId: new Types.ObjectId(bookId),
                status: 'pending'
            };

            const [data, total] = await Promise.all([
                this.reservationModel
                    .find(filter)
                    .sort({ priority: 1 })
                    .populate('userId')
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.reservationModel.countDocuments(filter),
            ]);

            this.logger.log(`Waiting list for book ${bookId}: ${data.length} reservations (page ${page}, total: ${total})`);

            return {
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            };
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
    async getUserReservationList(userId: string, pagination: PaginationDto = {}): Promise<PaginatedResult<Reservation>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const skip = (page - 1) * limit;
            const filter = { userId: new Types.ObjectId(userId) };

            const [data, total] = await Promise.all([
                this.reservationModel
                    .find(filter)
                    .populate('bookId')
                    .sort({ requestDate: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.reservationModel.countDocuments(filter),
            ]);

            this.logger.log(`Retrieved ${data.length} reservations for user ${userId} (page ${page}, total: ${total})`);
            return {
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Asigna el libro al mejor candidato según scoring compuesto.
     * Reemplaza el FIFO puro.
     *
     * Fórmula:
     *   Score = α*(1/posición) + β*puntualidadPromedio + γ*(espera/maxEspera) - δ*tasaDevTardias
     *
     * @param productId - ID del libro a asignar
     * @returns La reserva seleccionada o null si no hay pendientes
     */
    async fulfillReservation(productId: string): Promise<ReservationDocument | null> {
        try {
            // 1. Obtener reservas pendientes ordenadas por priority
            const pending = await this.reservationModel
                .find({
                    bookId: new Types.ObjectId(productId),
                    status: 'pending',
                })
                .populate('userId')
                .sort({ priority: 1 })
                .exec();

            if (pending.length === 0) {
                this.logger.log(`No pending reservations for product ${productId}`);
                return null;
            }

            // 2. Calcular tiempo máximo de espera entre todas las reservas
            const now = Date.now();
            const waitDaysList = pending.map(r =>
                Math.ceil((now - new Date(r.requestDate).getTime()) / (1000 * 60 * 60 * 24))
            );
            const maxWaitDays = Math.max(...waitDaysList, 1);

            // 3. Obtener historial con memoización: cache hit → usar caché, miss → batch aggregation
            const userIds = pending.map(r => (r.userId as any)._id.toString());
            const historyMap = await this.getHistoryWithMemoization(userIds);

            // 4. Calcular score para cada reserva
            const scored: ScoredReservation[] = pending.map((res, index) => {
                const userId = (res.userId as any)._id.toString();
                const waitDays = waitDaysList[index];

                const history = historyMap.get(userId);
                const puntualidadPromedio = history?.puntualidadPromedio ?? 0;
                const tasaDevTardias = history?.tasaDevTardias ?? 0;

                const breakdown = this.calculateScoreBreakdown(
                    res.priority,
                    puntualidadPromedio,
                    waitDays,
                    maxWaitDays,
                    tasaDevTardias,
                );

                return {
                    reservation: res,
                    score: breakdown.total,
                    breakdown,
                };
            });

            // 5. Ordenar por score descendente (mayor score = mejor candidato)
            scored.sort((a, b) => b.score - a.score);

            // 6. Seleccionar al ganador
            const winner = scored[0];
            winner.reservation.status = 'fulfilled';
            winner.reservation.fulfilledAt = new Date();
            winner.reservation.notifiedAt = new Date();
            await winner.reservation.save();

            // 7. Log detallado del scoring
            this.logScoringResults(productId, scored);

            // 8. Reordenar la cola restante
            await this.reorderQueue(productId);

            // 9. Limpiar caché expirada
            this.cleanExpiredCache();

            this.logger.log(
                `Reservation fulfilled: ${winner.reservation._id} | ` +
                `userId: ${(winner.reservation.userId as any)._id} | ` +
                `score: ${winner.score.toFixed(4)}`,
            );

            return winner.reservation;
        } catch (error: any) {
            this.logger.error(`Error fulfilling reservation for product ${productId}: ${error.message}`);
            throw new InternalServerErrorException(error.message);
        }
    }

    //  MÉTODOS PRIVADOS: MEMOIZACIÓN Y SCORING
    /**
     * Obtiene historial de préstamos con memoización.
     * 1. Consulta caché por cada usuario
     * 2. Solo ejecuta batch aggregation para usuarios sin caché válido
     * 3. Almacena resultados nuevos en caché con TTL de 5 minutos
     */
    private async getHistoryWithMemoization(
        userIds: string[],
    ): Promise<Map<string, UserLoanHistory>> {
        const resultMap = new Map<string, UserLoanHistory>();
        const uncachedUserIds: string[] = [];
        const now = new Date();

        // 1. Separar cache hits de cache misses
        for (const userId of userIds) {
            const cached = this.scoreCache.get(userId);
            if (cached && cached.expiresAt > now) {
                // Cache hit: usar valor cacheado
                resultMap.set(userId, {
                    userId,
                    puntualidadPromedio: cached.puntualidadPromedio,
                    tasaDevTardias: cached.tasaDevTardias,
                });
            } else {
                // Cache miss: necesitamos consultar MongoDB
                uncachedUserIds.push(userId);
            }
        }

        const cacheHits = userIds.length - uncachedUserIds.length;
        if (cacheHits > 0) {
            this.logger.debug(`Score cache: ${cacheHits} hits, ${uncachedUserIds.length} misses`);
        }

        // 2. Batch aggregation solo para usuarios no cacheados
        if (uncachedUserIds.length > 0) {
            const freshHistory = await this.batchGetUserLoanHistory(uncachedUserIds);

            // 3. Almacenar en caché y agregar al mapa de resultados
            for (const [userId, history] of freshHistory) {
                this.scoreCache.set(userId, {
                    puntualidadPromedio: history.puntualidadPromedio,
                    tasaDevTardias: history.tasaDevTardias,
                    expiresAt: new Date(now.getTime() + this.CACHE_TTL_MS),
                });

                resultMap.set(userId, history);
            }
        }

        // 4. Usuarios sin historial en DB = neutro (0)
        for (const userId of userIds) {
            if (!resultMap.has(userId)) {
                const neutro: UserLoanHistory = {
                    userId,
                    puntualidadPromedio: 0,
                    tasaDevTardias: 0,
                };
                resultMap.set(userId, neutro);

                // También cachear el neutro para evitar repetir la query
                this.scoreCache.set(userId, {
                    puntualidadPromedio: 0,
                    tasaDevTardias: 0,
                    expiresAt: new Date(now.getTime() + this.CACHE_TTL_MS),
                });
            }
        }

        return resultMap;
    }

    /**
     * Batch aggregation: obtiene historial de múltiples usuarios en 1 sola query.
     * Solo se llama para usuarios que NO están en caché.
     */
    private async batchGetUserLoanHistory(
        userIds: string[],
    ): Promise<Map<string, UserLoanHistory>> {
        const resultMap = new Map<string, UserLoanHistory>();

        if (userIds.length === 0) return resultMap;

        try {
            const aggregation = await this.loanModel.aggregate([
                {
                    $match: {
                        userId: { $in: userIds.map(id => new Types.ObjectId(id)) },
                        status: { $in: ['returned', 'overdue'] },
                    },
                },
                {
                    $group: {
                        _id: '$userId',
                        totalLoans: { $sum: 1 },
                        overdueLoans: {
                            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
                        },
                        onTimeLoans: {
                            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
                        },
                        totalLateDays: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'overdue'] },
                                            { $ne: ['$returnDate', null] },
                                            { $ne: ['$dueDate', null] },
                                        ],
                                    },
                                    {
                                        $max: [
                                            0,
                                            {
                                                $divide: [
                                                    { $subtract: ['$returnDate', '$dueDate'] },
                                                    86400000,
                                                ],
                                            },
                                        ],
                                    },
                                    0,
                                ],
                            },
                        },
                        overdueWithReturnDate: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'overdue'] },
                                            { $ne: ['$returnDate', null] },
                                            { $ne: ['$dueDate', null] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        totalLoans: 1,
                        puntualidadPromedio: {
                            $cond: [
                                { $eq: ['$totalLoans', 0] },
                                0,
                                { $divide: ['$onTimeLoans', '$totalLoans'] },
                            ],
                        },
                        tasaDevTardias: {
                            $cond: [
                                { $eq: ['$totalLoans', 0] },
                                0,
                                { $divide: ['$overdueLoans', '$totalLoans'] },
                            ],
                        },
                    },
                },
            ]);

            for (const doc of aggregation) {
                const userId = doc._id.toString();
                resultMap.set(userId, {
                    userId,
                    puntualidadPromedio: doc.puntualidadPromedio,
                    tasaDevTardias: doc.tasaDevTardias,
                });
            }

            return resultMap;
        } catch (error: any) {
            this.logger.error(`Error in batch loan history query: ${error.message}`);
            return resultMap;
        }
    }

    /**
     * Calcula el desglose del score compuesto.
     */
    private calculateScoreBreakdown(
        priority: number,
        puntualidadPromedio: number,
        waitDays: number,
        maxWaitDays: number,
        tasaDevTardias: number,
    ): ScoreBreakdown {
        const positionScore = 1 / priority;
        const punctualityScore = Math.max(0, Math.min(1, puntualidadPromedio));
        const waitScore = maxWaitDays > 0 ? waitDays / maxWaitDays : 0;
        const penaltyScore = Math.max(0, Math.min(1, tasaDevTardias));

        const total =
            this.ALPHA * positionScore +
            this.BETA * punctualityScore +
            this.GAMMA * waitScore -
            this.DELTA * penaltyScore;

        return {
            total: Math.max(0, total),
            positionScore,
            punctualityScore,
            waitScore,
            penaltyScore,
        };
    }

    /**
     * Registra los resultados del scoring en logs para debugging.
     */
    private logScoringResults(productId: string, scored: ScoredReservation[]): void {
        const lines = scored.map((s, i) => {
            const userId = (s.reservation.userId as any)?._id?.toString() || 'unknown';
            return (
                `  ${i === 0 ? '→' : ' '} #${i + 1} userId=${userId} ` +
                `priority=${s.reservation.priority} ` +
                `score=${s.score.toFixed(4)} ` +
                `[pos=${s.breakdown.positionScore.toFixed(3)} ` +
                `punct=${s.breakdown.punctualityScore.toFixed(3)} ` +
                `wait=${s.breakdown.waitScore.toFixed(3)} ` +
                `penalty=${s.breakdown.penaltyScore.toFixed(3)}]`
            );
        });

        this.logger.debug(
            `Scoring results for product ${productId} (${scored.length} reservations):\n${lines.join('\n')}`,
        );
    }

    /**
     * Reordena la cola después de cumplir o cancelar una reservación.
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
     * Obtiene el historial de préstamos de múltiples usuarios en una sola query.
     * Usa aggregation pipeline de MongoDB para resolver O(1) en lugar de O(N).
     */
    private async getBatchUserLoanHistory(
        userIds: string[],
    ): Promise<Map<string, UserLoanHistory>> {
        const resultMap = new Map<string, UserLoanHistory>();

        if (userIds.length === 0) return resultMap;

        try {
            const aggregation = await this.loanModel.aggregate([
                {
                    $match: {
                        userId: { $in: userIds.map(id => new Types.ObjectId(id)) },
                        status: { $in: ['returned', 'overdue'] },
                    },
                },
                {
                    $group: {
                        _id: '$userId',
                        totalLoans: { $sum: 1 },
                        overdueLoans: {
                            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
                        },
                        onTimeLoans: {
                            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] },
                        },
                        totalLateDays: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'overdue'] },
                                            { $ne: ['$returnDate', null] },
                                            { $ne: ['$dueDate', null] },
                                        ],
                                    },
                                    {
                                        $max: [
                                            0,
                                            {
                                                $divide: [
                                                    { $subtract: ['$returnDate', '$dueDate'] },
                                                    86400000,
                                                ],
                                            },
                                        ],
                                    },
                                    0,
                                ],
                            },
                        },
                        overdueWithReturnDate: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$status', 'overdue'] },
                                            { $ne: ['$returnDate', null] },
                                            { $ne: ['$dueDate', null] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        totalLoans: 1,
                        puntualidadPromedio: {
                            $cond: [
                                { $eq: ['$totalLoans', 0] },
                                0,
                                { $divide: ['$onTimeLoans', '$totalLoans'] },
                            ],
                        },
                        tasaDevTardias: {
                            $cond: [
                                { $eq: ['$totalLoans', 0] },
                                0,
                                { $divide: ['$overdueLoans', '$totalLoans'] },
                            ],
                        },
                    },
                },
            ]);

            for (const doc of aggregation) {
                const userId = doc._id.toString();
                resultMap.set(userId, {
                    userId,
                    puntualidadPromedio: doc.puntualidadPromedio,
                    tasaDevTardias: doc.tasaDevTardias,
                });
            }

            // Usuarios sin historial = neutro (0)
            for (const userId of userIds) {
                if (!resultMap.has(userId)) {
                    resultMap.set(userId, {
                        userId,
                        puntualidadPromedio: 0,
                        tasaDevTardias: 0,
                    });
                }
            }

            return resultMap;
        } catch (error: any) {
            this.logger.error(`Error fetching batch loan history: ${error.message}`);
            for (const userId of userIds) {
                if (!resultMap.has(userId)) {
                    resultMap.set(userId, {
                        userId,
                        puntualidadPromedio: 0,
                        tasaDevTardias: 0,
                    });
                }
            }
            return resultMap;
        }
    }

    /**
     * Limpia entradas expiradas del caché en memoria.
     */
    private cleanExpiredCache(): void {
        const now = new Date();
        let cleaned = 0;
        for (const [key, entry] of this.scoreCache.entries()) {
            if (entry.expiresAt <= now) {
                this.scoreCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.debug(`Cache cleaned: ${cleaned} expired entries removed`);
        }
    }
}