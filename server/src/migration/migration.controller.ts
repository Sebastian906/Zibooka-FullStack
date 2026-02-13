import { Controller, Get, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MigrationService } from './migration.service';
import type { Response } from 'express';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';

@ApiTags('Migration')
@Controller('migration')
@UseGuards(AdminAuthGuard)
@ApiCookieAuth('adminToken')
export class MigrationController {
    constructor(private readonly migrationService: MigrationService) { }

    @Post('run')
    @ApiOperation({
        summary: 'Execute full migration from MongoDB to MySQL (Admin only)',
        description: 'Migrates all collections in order: users → products → addresses → orders → shelves → loans → reservations'
    })
    @ApiResponse({
        status: 200,
        description: 'Migration completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Migration completed successfully' },
                stats: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            collection: { type: 'string', example: 'users' },
                            total: { type: 'number', example: 42 },
                            migrated: { type: 'number', example: 42 },
                            failed: { type: 'number', example: 0 },
                            errors: { type: 'array', items: { type: 'string' } }
                        }
                    }
                },
                totalTime: { type: 'string', example: '15.43 seconds' }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    @ApiResponse({ status: 500, description: 'Migration failed' })
    async runMigration(@Res() res: Response) {
        try {
            console.log('[MigrationController] Starting full migration...');
            const result = await this.migrationService.runFullMigration();

            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            console.error('[MigrationController] Migration error:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('remigrate-shelves')
    @ApiOperation({
        summary: 'Re-migrate only shelves (Admin only)',
        description: 'Deletes existing shelves data and re-migrates from MongoDB. Useful for fixing migration issues.'
    })
    @ApiResponse({
        status: 200,
        description: 'Shelves re-migrated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Shelves re-migrated successfully' },
                stats: {
                    type: 'object',
                    properties: {
                        collection: { type: 'string', example: 'shelves' },
                        total: { type: 'number', example: 12 },
                        migrated: { type: 'number', example: 12 },
                        failed: { type: 'number', example: 0 },
                        errors: { type: 'array', items: { type: 'string' } }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async remigrateShelves(@Res() res: Response) {
        try {
            console.log('[MigrationController] Re-migrating shelves...');
            const result = await this.migrationService.remigrateShelves();

            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            console.error('[MigrationController] Shelves re-migration error:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('status')
    @ApiOperation({
        summary: 'Check migration status (Admin only)',
        description: 'Compares record counts between MongoDB and MySQL'
    })
    @ApiResponse({
        status: 200,
        description: 'Migration status retrieved',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                mongo: {
                    type: 'object',
                    additionalProperties: { type: 'number' },
                    example: { users: 42, products: 150, orders: 87 }
                },
                mysql: {
                    type: 'object',
                    additionalProperties: { type: 'number' },
                    example: { users: 42, products: 150, orders: 87 }
                },
                differences: {
                    type: 'object',
                    additionalProperties: {
                        type: 'object',
                        properties: {
                            mongo: { type: 'number' },
                            mysql: { type: 'number' },
                            diff: { type: 'number' }
                        }
                    },
                    example: {
                        users: { mongo: 42, mysql: 42, diff: 0 },
                        products: { mongo: 150, mysql: 148, diff: 2 }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async getMigrationStatus(@Res() res: Response) {
        try {
            const status = await this.migrationService.getMigrationStatus();

            return res.status(HttpStatus.OK).json({
                success: true,
                ...status,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}