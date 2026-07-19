import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
    private readonly logger = new Logger(NotificationScheduler.name);

    constructor(private readonly notificationService: NotificationService) {
        this.logger.log('NotificationScheduler initialized');
    }

    /**
     * Tarea programada: diariamente a las 9:00 AM
     * Verifica loans/reservations próximos a vencer y envía recordatorios.
     *
     * Cron: '0 9 * * *' = cada día a las 09:00
     *
     * En Render free tier, el cron puede no ejecutarse si el dyno está dormido.
     * Alternativa: usar un endpoint HTTP externo que llame a /api/admin/notifications/process
     */
    @Cron('0 9 * * *')
    async handleExpiringNotifications() {
        this.logger.log('=== Scheduled job: Expiring notifications check ===');

        try {
            const result = await this.notificationService.processAutomaticNotifications();

            this.logger.log(
                `Scheduled job completed: ` +
                `loans=${result.loansProcessed}, ` +
                `reservations=${result.reservationsProcessed}, ` +
                `errors=${result.errors}`,
            );

            if (result.errors > 0) {
                this.logger.warn(
                    `${result.errors} errors occurred during notification processing. Check logs for details.`,
                );
            }
        } catch (error: any) {
            this.logger.error(
                `Scheduled job failed: ${error.message}`,
                error.stack,
            );
        }
    }

    /**
     * Endpoint auxiliar para ejecutar el procesamiento manualmente.
     * Puede ser llamado desde un cron externo (ej: EasyCron, cron-job.org)
     * o desde el panel de admin para testing.
     *
     * POST /api/admin/notifications/process
     */
    async triggerManualProcess() {
        this.logger.log('=== Manual trigger: Expiring notifications check ===');

        try {
            const result = await this.notificationService.processAutomaticNotifications();
            return result;
        } catch (error: any) {
            this.logger.error(
                `Manual trigger failed: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}
