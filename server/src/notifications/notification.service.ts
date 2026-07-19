import { Injectable, InternalServerErrorException, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { Loan, LoanDocument } from 'src/loans/schemas/loan.schema';
import { Reservation, ReservationDocument } from 'src/reservations/schemas/reservation.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { EmailService } from 'src/email/email.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PaginatedResult } from 'src/common/dto/pagination.dto';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    // Días antes del vencimiento para enviar recordatorio (configurable via env)
    private readonly DAYS_BEFORE: number;

    constructor(
        @InjectModel(Notification.name)
        private notificationModel: Model<NotificationDocument>,
        @InjectModel(Loan.name)
        private loanModel: Model<LoanDocument>,
        @InjectModel(Reservation.name)
        private reservationModel: Model<ReservationDocument>,
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
        private emailService: EmailService,
        private configService: ConfigService,
    ) {
        this.DAYS_BEFORE = this.configService.get<number>('NOTIFICATION_DAYS_BEFORE', 3);
        this.logger.log(`NotificationService initialized | daysBefore=${this.DAYS_BEFORE}`);
    }

    // 1. PROCESAMIENTO AUTOMÁTICO (llamado por el scheduler)

    /**
     * Procesa todas las notificaciones automáticas: loans y reservations
     * próximos a vencer que no hayan sido notificados en la ventana actual.
     */
    async processAutomaticNotifications(): Promise<{
        loansProcessed: number;
        reservationsProcessed: number;
        errors: number;
    }> {
        this.logger.log('Starting automatic notification processing...');

        const now = new Date();
        const deadline = new Date(now.getTime() + this.DAYS_BEFORE * 24 * 60 * 60 * 1000);

        let loansProcessed = 0;
        let reservationsProcessed = 0;
        let errors = 0;

        // --- Procesar Loans ---
        try {
            const expiringLoans = await this.findExpiringLoans(deadline, now);
            this.logger.log(`Found ${expiringLoans.length} loans expiring in ${this.DAYS_BEFORE} days`);

            for (const loan of expiringLoans) {
                try {
                    await this.processLoanNotification(loan);
                    loansProcessed++;
                } catch (error: any) {
                    errors++;
                    this.logger.error(`Failed to notify loan ${loan._id}: ${error.message}`);
                }
            }
        } catch (error: any) {
            this.logger.error(`Error fetching expiring loans: ${error.message}`);
            errors++;
        }

        // --- Procesar Reservations ---
        try {
            const expiringReservations = await this.findExpiringReservations(deadline, now);
            this.logger.log(`Found ${expiringReservations.length} reservations expiring in ${this.DAYS_BEFORE} days`);

            for (const reservation of expiringReservations) {
                try {
                    await this.processReservationNotification(reservation);
                    reservationsProcessed++;
                } catch (error: any) {
                    errors++;
                    this.logger.error(`Failed to notify reservation ${reservation._id}: ${error.message}`);
                }
            }
        } catch (error: any) {
            this.logger.error(`Error fetching expiring reservations: ${error.message}`);
            errors++;
        }

        const result = { loansProcessed, reservationsProcessed, errors };
        this.logger.log(
            `Automatic notification processing completed: ` +
            `loans=${loansProcessed}, reservations=${reservationsProcessed}, errors=${errors}`,
        );
        return result;
    }

    // 2. NOTIFICACIÓN MANUAL (llamado por admin)
    
    /**
     * Envía una notificación manual desde el panel de administración.
     */
    async sendManualNotification(
        dto: SendNotificationDto,
        adminEmail: string,
    ): Promise<void> {
        // Validar que el destinatario exista
        const user = await this.userModel.findById(dto.recipientId).select('-password');
        if (!user) {
            throw new NotFoundException('Recipient user not found');
        }

        // Determinar el título del libro para incluir en el email
        let bookTitle = 'N/A';
        if (dto.relatedModel === 'Loan' && dto.relatedId) {
            const loan = await this.loanModel.findById(dto.relatedId).populate('bookId');
            if (loan && (loan.bookId as any)?.name) {
                bookTitle = (loan.bookId as any).name;
            }
        } else if (dto.relatedModel === 'Reservation' && dto.relatedId) {
            const reservation = await this.reservationModel.findById(dto.relatedId).populate('bookId');
            if (reservation && (reservation.bookId as any)?.name) {
                bookTitle = (reservation.bookId as any).name;
            }
        }

        // Enviar email
        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL', 'http://localhost:5173');
        const subject = dto.subject || `Notificación de Zibooka - ${bookTitle}`;
        const message = dto.message || `Estimado/a ${user.name}, tiene un mensaje del administrador sobre el libro "${bookTitle}".`;

        const emailSent = await this.emailService.sendAdminNotification(
            user.email,
            user.name,
            subject,
            message,
            adminEmail,
        );

        // Registrar en historial
        await this.createNotificationRecord({
            userId: new Types.ObjectId(dto.recipientId),
            type: 'manual',
            subject,
            message: dto.message || '',
            ...(dto.relatedId && dto.relatedModel ? {
                relatedId: new Types.ObjectId(dto.relatedId),
                relatedModel: dto.relatedModel,
            } : {}),
            status: emailSent ? 'sent' : 'failed',
            error: emailSent ? null : 'Email delivery failed',
            sentBy: 'admin',
        });

        if (!emailSent) {
            this.logger.warn(`Manual notification to ${user.email} failed to send`);
        } else {
            this.logger.log(`Manual notification sent to ${user.email} by admin ${adminEmail}`);
        }
    }

    // 3. OBTENER ITEMS PRÓXIMOS A VENCER (para panel admin)

    /**
     * Retorna loans y reservations próximos a vencer para el panel admin.
     */
    async getExpiringItems(): Promise<{
        loans: any[];
        reservations: any[];
    }> {
        const now = new Date();
        const deadline = new Date(now.getTime() + this.DAYS_BEFORE * 24 * 60 * 60 * 1000);

        const loans = await this.findExpiringLoans(deadline, now)
            .populate('userId', 'name email')
            .populate('bookId', 'name images')
            .lean();

        const reservations = await this.findExpiringReservations(deadline, now)
            .populate('userId', 'name email')
            .populate('bookId', 'name images')
            .lean();

        return { loans, reservations };
    }

    // 4. HISTORIAL DE NOTIFICACIONES
    
    /**
     * Obtiene el historial de notificaciones con filtros y paginación.
     */
    async getNotificationHistory(
        query: NotificationQueryDto,
    ): Promise<PaginatedResult<Notification>> {
        const { page = 1, limit = 20, type, userId, status } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (type) filter.type = type;
        if (userId) filter.userId = new Types.ObjectId(userId);
        if (status) filter.status = status;

        const [data, total] = await Promise.all([
            this.notificationModel
                .find(filter)
                .populate('userId', 'name email')
                .sort({ sentAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.notificationModel.countDocuments(filter),
        ]);

        this.logger.log(
            `Notification history retrieved: ${data.length} items (page ${page}, total: ${total})`,
        );

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // 5. ESTADÍSTICAS
    
    /**
     * Obtiene estadísticas de notificaciones.
     */
    async getNotificationStats(): Promise<{
        totalSent: number;
        sentToday: number;
        failedCount: number;
        pendingCount: number;
    }> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalSent, sentToday, failedCount, pendingCount] = await Promise.all([
            this.notificationModel.countDocuments({ status: 'sent' }),
            this.notificationModel.countDocuments({ status: 'sent', sentAt: { $gte: todayStart } }),
            this.notificationModel.countDocuments({ status: 'failed' }),
            this.notificationModel.countDocuments({ status: 'pending' }),
        ]);

        return { totalSent, sentToday, failedCount, pendingCount };
    }

    // 6. PREFERENCIAS DE USUARIO
    
    /**
     * Obtiene las preferencias de notificación del usuario.
     */
    async getNotificationPreferences(
        userId: string,
    ): Promise<{ emailReminders: boolean }> {
        const user = await this.userModel.findById(userId).select('notificationPreferences');
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            emailReminders: user.notificationPreferences?.emailReminders ?? true,
        };
    }

    /**
     * Actualiza las preferencias de notificación del usuario.
     */
    async updateNotificationPreferences(
        userId: string,
        preferences: { emailReminders: boolean },
    ): Promise<void> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.userModel.findByIdAndUpdate(userId, {
            notificationPreferences: {
                emailReminders: preferences.emailReminders,
            },
        });

        this.logger.log(
            `Notification preferences updated for user ${userId}: emailReminders=${preferences.emailReminders}`,
        );
    }

    // MÉTODOS PRIVADOS
    
    /**
     * Busca loans activos próximos a vencer que no hayan sido notificados.
     */
    private findExpiringLoans(deadline: Date, now: Date) {
        return this.loanModel.find({
            status: 'active',
            dueDate: { $lte: deadline, $gt: now },
            $or: [
                { notifiedAt: null },
                { notifiedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
            ],
        }).populate('userId');
    }

    /**
     * Busca reservations pendientes próximas a expirar que no hayan sido notificadas.
     */
    private findExpiringReservations(deadline: Date, now: Date) {
        return this.reservationModel.find({
            status: 'pending',
            expiresAt: { $lte: deadline, $gt: now },
            $or: [
                { notifiedAt: null },
                { notifiedAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
            ],
        }).populate('userId');
    }

    /**
     * Procesa el envío de notificación para un loan específico.
     */
    private async processLoanNotification(loan: LoanDocument): Promise<void> {
        const user = loan.userId as any;

        // Verificar que el user esté poblado y tenga email
        if (!user?.email) {
            this.logger.warn(`Loan ${loan._id}: user not populated or missing email, skipping`);
            return;
        }

        // Verificar preferencias del usuario
        const preferences = await this.getNotificationPreferences(user._id.toString());
        if (!preferences.emailReminders) {
            this.logger.log(`Loan ${loan._id}: user ${user._id} has notifications disabled, skipping`);
            return;
        }

        // Calcular días restantes
        const now = new Date();
        const daysRemaining = Math.ceil(
            (loan.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Obtener título del libro (puede estar poblado o no)
        let bookTitle = 'Unknown Book';
        if ((loan.bookId as any)?.name) {
            bookTitle = (loan.bookId as any).name;
        } else {
            // Si no está poblado, poblar manualmente
            const populated = await this.loanModel.findById(loan._id).populate('bookId');
            if (populated && (populated.bookId as any)?.name) {
                bookTitle = (populated.bookId as any).name;
            }
        }

        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL', 'http://localhost:5173');

        // Enviar email
        const emailSent = await this.emailService.sendLoanReminder(
            user.email,
            user.name,
            bookTitle,
            loan.dueDate,
            daysRemaining,
            frontendUrl,
        );

        // Actualizar notifiedAt en el loan
        if (emailSent) {
            await this.loanModel.findByIdAndUpdate(loan._id, { notifiedAt: new Date() });
        }

        // Registrar en historial
        await this.createNotificationRecord({
            userId: user._id,
            type: 'loan_reminder',
            subject: `Recordatorio de préstamo - ${bookTitle}`,
            message: `Tu préstamo vence en ${daysRemaining} días`,
            relatedId: loan._id,
            relatedModel: 'Loan',
            status: emailSent ? 'sent' : 'failed',
            error: emailSent ? null : 'Email delivery failed',
            sentBy: 'system',
        });

        this.logger.log(
            `Loan reminder: ${loan._id} → ${user.email} | status=${emailSent ? 'sent' : 'failed'} | daysRemaining=${daysRemaining}`,
        );
    }

    /**
     * Procesa el envío de notificación para una reservation específica.
     */
    private async processReservationNotification(reservation: ReservationDocument): Promise<void> {
        const user = reservation.userId as any;

        // Verificar que el user esté poblado y tenga email
        if (!user?.email) {
            this.logger.warn(`Reservation ${reservation._id}: user not populated or missing email, skipping`);
            return;
        }

        // Verificar preferencias del usuario
        const preferences = await this.getNotificationPreferences(user._id.toString());
        if (!preferences.emailReminders) {
            this.logger.log(`Reservation ${reservation._id}: user ${user._id} has notifications disabled, skipping`);
            return;
        }

        // Calcular días restantes
        const now = new Date();
        const daysRemaining = Math.ceil(
            (reservation.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Obtener título del libro
        let bookTitle = 'Unknown Book';
        if ((reservation.bookId as any)?.name) {
            bookTitle = (reservation.bookId as any).name;
        } else {
            const populated = await this.reservationModel.findById(reservation._id).populate('bookId');
            if (populated && (populated.bookId as any)?.name) {
                bookTitle = (populated.bookId as any).name;
            }
        }

        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL', 'http://localhost:5173');

        // Enviar email
        const emailSent = await this.emailService.sendReservationReminder(
            user.email,
            user.name,
            bookTitle,
            reservation.expiresAt,
            daysRemaining,
            reservation.priority,
            frontendUrl,
        );

        // Actualizar notifiedAt en la reservation
        if (emailSent) {
            await this.reservationModel.findByIdAndUpdate(reservation._id, { notifiedAt: new Date() });
        }

        // Registrar en historial
        await this.createNotificationRecord({
            userId: user._id,
            type: 'reservation_reminder',
            subject: `Recordatorio de reserva - ${bookTitle}`,
            message: `Tu reserva expira en ${daysRemaining} días. Posición en cola: ${reservation.priority}`,
            relatedId: reservation._id,
            relatedModel: 'Reservation',
            status: emailSent ? 'sent' : 'failed',
            error: emailSent ? null : 'Email delivery failed',
            sentBy: 'system',
        });

        this.logger.log(
            `Reservation reminder: ${reservation._id} → ${user.email} | status=${emailSent ? 'sent' : 'failed'} | daysRemaining=${daysRemaining}`,
        );
    }

    /**
     * Crea un registro de notificación en la tabla de auditoría.
     */
    private async createNotificationRecord(data: {
        userId: Types.ObjectId;
        type: string;
        subject: string;
        message: string;
        relatedId?: Types.ObjectId;
        relatedModel?: string;
        status: string;
        error: string | null;
        sentBy: string;
    }): Promise<void> {
        try {
            const record: any = {
                userId: data.userId,
                type: data.type,
                subject: data.subject,
                message: data.message,
                sentAt: new Date(),
                status: data.status,
                error: data.error,
                sentBy: data.sentBy,
            };
            if (data.relatedId && data.relatedModel) {
                record.relatedId = data.relatedId;
                record.relatedModel = data.relatedModel;
            }
            await this.notificationModel.create(record);
        } catch (error: any) {
            this.logger.error(`Failed to create notification record: ${error.message}`);
        }
    }
}
