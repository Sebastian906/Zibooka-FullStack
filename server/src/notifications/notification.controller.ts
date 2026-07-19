import { Body, Controller, Get, HttpStatus, Post, Put, Query, Res, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import { AdminEmail } from 'src/common/decorators/admin/admin-email.decorator';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';

// Custom decorator to skip class-level AuthGuard (same pattern as loan.controller.ts)
export const SkipAuthGuard = () => SetMetadata('skipAuthGuard', true);

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly notificationScheduler: NotificationScheduler,
    ) {}

    // ENDPOINTS DE ADMIN
    @Get('admin/pending')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get expiring loans and reservations (Admin only)',
        description: 'Returns loans and reservations that are about to expire within the configured notification window',
    })
    @ApiResponse({
        status: 200,
        description: 'Expiring items retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                loans: { type: 'array' },
                reservations: { type: 'array' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async getPendingNotifications(@Res() res: Response) {
        try {
            const result = await this.notificationService.getExpiringItems();

            return res.status(HttpStatus.OK).json({
                success: true,
                loans: result.loans,
                reservations: result.reservations,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('admin/send')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Send manual notification (Admin only)',
        description: 'Sends a custom notification email to a specific user',
    })
    @ApiBody({ type: SendNotificationDto })
    @ApiResponse({
        status: 200,
        description: 'Notification sent successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Notification sent successfully' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async sendManualNotification(
        @AdminEmail() adminEmail: string,
        @Body() dto: SendNotificationDto,
        @Res() res: Response,
    ) {
        try {
            await this.notificationService.sendManualNotification(dto, adminEmail);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Notification sent successfully',
            });
        } catch (error: any) {
            const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
            return res.status(status).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('admin/history')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get notification history (Admin only)',
        description: 'Returns paginated notification history with optional filters',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'type', required: false, enum: ['loan_reminder', 'reservation_reminder', 'manual'], description: 'Filter by type' })
    @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
    @ApiQuery({ name: 'status', required: false, enum: ['sent', 'failed', 'pending'], description: 'Filter by status' })
    @ApiResponse({
        status: 200,
        description: 'Notification history retrieved successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async getNotificationHistory(
        @Query() query: NotificationQueryDto,
        @Res() res: Response,
    ) {
        try {
            const result = await this.notificationService.getNotificationHistory(query);

            return res.status(HttpStatus.OK).json({
                success: true,
                notifications: result.data,
                pagination: result.pagination,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('admin/stats')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get notification statistics (Admin only)',
        description: 'Returns summary statistics of sent notifications',
    })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                stats: {
                    type: 'object',
                    properties: {
                        totalSent: { type: 'number', example: 150 },
                        sentToday: { type: 'number', example: 5 },
                        failedCount: { type: 'number', example: 2 },
                        pendingCount: { type: 'number', example: 0 },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async getNotificationStats(@Res() res: Response) {
        try {
            const stats = await this.notificationService.getNotificationStats();

            return res.status(HttpStatus.OK).json({
                success: true,
                stats,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('admin/process')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Manually trigger notification processing (Admin only)',
        description: 'Triggers the same logic as the scheduled job. Useful for testing or external cron jobs.',
    })
    @ApiResponse({
        status: 200,
        description: 'Processing triggered successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                result: {
                    type: 'object',
                    properties: {
                        loansProcessed: { type: 'number', example: 3 },
                        reservationsProcessed: { type: 'number', example: 1 },
                        errors: { type: 'number', example: 0 },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async triggerProcess(@Res() res: Response) {
        try {
            const result = await this.notificationScheduler.triggerManualProcess();

            return res.status(HttpStatus.OK).json({
                success: true,
                result,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ============================================================
    // ENDPOINTS DE USUARIO
    // ============================================================

    @Get('preferences')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({
        summary: 'Get notification preferences',
        description: 'Returns the current user notification preferences',
    })
    @ApiResponse({
        status: 200,
        description: 'Preferences retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                preferences: {
                    type: 'object',
                    properties: {
                        emailReminders: { type: 'boolean', example: true },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async getPreferences(
        @UserId() userId: string,
        @Res() res: Response,
    ) {
        try {
            const preferences = await this.notificationService.getNotificationPreferences(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                preferences,
            });
        } catch (error: any) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Put('preferences')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({
        summary: 'Update notification preferences',
        description: 'Updates the current user notification preferences',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                emailReminders: { type: 'boolean', example: true },
            },
            required: ['emailReminders'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Preferences updated successfully',
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async updatePreferences(
        @UserId() userId: string,
        @Body('emailReminders') emailReminders: boolean,
        @Res() res: Response,
    ) {
        try {
            await this.notificationService.updateNotificationPreferences(userId, { emailReminders });

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Notification preferences updated',
            });
        } catch (error: any) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}
