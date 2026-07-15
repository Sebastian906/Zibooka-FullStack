import { BadRequestException, Body, Controller, Get, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import type { Response } from 'express';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { AdminEmail } from 'src/common/decorators/admin/admin-email.decorator';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
    constructor(private readonly reportsService: ReportService) { }

    /**
     * Descargar reporte de inventario en PDF
     */
    @Get('inventory/pdf')
    @ApiOperation({
        summary: 'Download inventory report as PDF',
        description: 'Generates a PDF report with inventory data, optionally filtered by category. Includes recursion analysis when category is specified.',
    })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'Filter by book category',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'],
    })
    @ApiResponse({
        status: 200,
        description: 'PDF file generated successfully',
        content: {
            'application/pdf': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async downloadInventoryPDF(
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        try {
            const pdfBuffer = await this.reportsService.generateInventoryPDF(category);

            const filename = category
                ? `inventario-${category}-${new Date().getTime()}.pdf`
                : `inventario-completo-${new Date().getTime()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.status(HttpStatus.OK).send(pdfBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Descargar reporte de inventario en XLSX
     */
    @Get('inventory/xlsx')
    @ApiOperation({
        summary: 'Download inventory report as Excel',
        description: 'Generates an Excel report with inventory data and formulas. Includes recursion analysis sheet when category is specified.',
    })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'Filter by book category',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'],
    })
    @ApiResponse({
        status: 200,
        description: 'Excel file generated successfully',
        content: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async downloadInventoryXLSX(
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        try {
            const xlsxBuffer = await this.reportsService.generateInventoryXLSX(category);

            const filename = category
                ? `inventario-${category}-${new Date().getTime()}.xlsx`
                : `inventario-completo-${new Date().getTime()}.xlsx`;

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', xlsxBuffer.length);

            return res.status(HttpStatus.OK).send(xlsxBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Descargar reporte de préstamos en PDF
     */
    @Get('loans/pdf')
    @ApiOperation({
        summary: 'Download loans report as PDF',
        description: 'Generates a PDF report with loan history, optionally filtered by date range.',
    })
    @ApiQuery({
        name: 'dateFrom',
        required: false,
        description: 'Start date (YYYY-MM-DD)',
        example: '2024-01-01',
    })
    @ApiQuery({
        name: 'dateTo',
        required: false,
        description: 'End date (YYYY-MM-DD)',
        example: '2024-12-31',
    })
    @ApiResponse({
        status: 200,
        description: 'PDF file generated successfully',
        content: {
            'application/pdf': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async downloadLoansPDF(
        @Query('dateFrom') dateFrom: string,
        @Query('dateTo') dateTo: string,
        @Res() res: Response,
    ) {
        try {
            const fromDate = dateFrom ? new Date(dateFrom) : undefined;
            const toDate = dateTo ? new Date(dateTo) : undefined;

            if (fromDate && isNaN(fromDate.getTime())) {
                throw new BadRequestException('Invalid dateFrom format. Use YYYY-MM-DD');
            }
            if (toDate && isNaN(toDate.getTime())) {
                throw new BadRequestException('Invalid dateTo format. Use YYYY-MM-DD');
            }

            const pdfBuffer = await this.reportsService.generateLoansPDF(fromDate, toDate);

            const filename = `prestamos-${new Date().getTime()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.status(HttpStatus.OK).send(pdfBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Descargar reporte de préstamos en XLSX
     */
    @Get('loans/xlsx')
    @ApiOperation({
        summary: 'Download loans report as Excel',
        description: 'Generates an Excel report with loan history and statistics, with formulas for analysis.',
    })
    @ApiQuery({
        name: 'dateFrom',
        required: false,
        description: 'Start date (YYYY-MM-DD)',
        example: '2024-01-01',
    })
    @ApiQuery({
        name: 'dateTo',
        required: false,
        description: 'End date (YYYY-MM-DD)',
        example: '2024-12-31',
    })
    @ApiResponse({
        status: 200,
        description: 'Excel file generated successfully',
        content: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async downloadLoansXLSX(
        @Query('dateFrom') dateFrom: string,
        @Query('dateTo') dateTo: string,
        @Res() res: Response,
    ) {
        try {
            const fromDate = dateFrom ? new Date(dateFrom) : undefined;
            const toDate = dateTo ? new Date(dateTo) : undefined;

            if (fromDate && isNaN(fromDate.getTime())) {
                throw new BadRequestException('Invalid dateFrom format. Use YYYY-MM-DD');
            }
            if (toDate && isNaN(toDate.getTime())) {
                throw new BadRequestException('Invalid dateTo format. Use YYYY-MM-DD');
            }

            const xlsxBuffer = await this.reportsService.generateLoansXLSX(fromDate, toDate);

            const filename = `prestamos-${new Date().getTime()}.xlsx`;

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', xlsxBuffer.length);

            return res.status(HttpStatus.OK).send(xlsxBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Preview de datos de recursión por categoría (JSON)
     */
    @Get('recursion/preview')
    @ApiOperation({
        summary: 'Preview recursion data for all categories',
        description: 'Returns recursion analysis (value and weight) for all available categories in JSON format.',
    })
    @ApiResponse({
        status: 200,
        description: 'Recursion data retrieved successfully',
    })
    async getRecursionPreview(@Res() res: Response) {
        try {
            // Obtener todas las categorías disponibles
            const categories = ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'];

            const recursionData = await Promise.all(
                categories.map(async (category) => {
                    try {
                        const [valueData, weightData] = await Promise.all([
                            this.reportsService['productsService'].calculateTotalValueByCategory(category),
                            this.reportsService['productsService'].calculateAverageWeightByCategory(category),
                        ]);

                        return {
                            category,
                            value: {
                                total: valueData.totalValue,
                                bookCount: valueData.bookCount,
                                average: valueData.bookCount > 0 ? valueData.totalValue / valueData.bookCount : 0,
                            },
                            weight: {
                                average: weightData.averageWeight,
                                total: weightData.totalWeight,
                                bookCount: weightData.bookCount,
                            },
                        };
                    } catch (error: any) {
                        return {
                            category,
                            error: error.message,
                        };
                    }
                })
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                data: recursionData.filter(d => !d.error),
                errors: recursionData.filter(d => d.error),
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('inventory/optimized')
    @ApiOperation({ summary: 'Get optimized inventory report (JSON preview)' })
    @ApiQuery({ name: 'maxRecords', required: false, type: Number, example: 50 })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'Filter by book category',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'],
    })
    async getOptimizedInventoryReport(
        @Query('maxRecords') maxRecords: string,
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        try {
            const max = Math.min(parseInt(maxRecords) || 50, 200);
            const result = await this.reportsService.generateOptimizedInventoryReport({
                maxRecords: max,
                category,
            });
            return res.status(HttpStatus.OK).json({ success: true, data: result });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Endpoint para descargar PDF del reporte optimizado
    @Get('inventory/optimized/pdf')
    @ApiOperation({ summary: 'Download optimized inventory report as PDF' })
    @ApiQuery({ name: 'maxRecords', required: false, type: Number, example: 50 })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'Filter by book category',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'],
    })
    @ApiResponse({ status: 200, description: 'PDF file generated successfully' })
    async downloadOptimizedInventoryPDF(
        @Query('maxRecords') maxRecords: string,
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        try {
            const max = Math.min(parseInt(maxRecords) || 50, 200);
            const reportData = await this.reportsService.generateOptimizedInventoryReport({
                maxRecords: max,
                category,
            });
            const pdfBuffer = await this.reportsService.generateOptimizedPDF(reportData);

            const filename = `inventario-optimizado-${Date.now()}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            return res.status(HttpStatus.OK).send(pdfBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // Endpoint para descargar XLSX del reporte optimizado
    @Get('inventory/optimized/xlsx')
    @ApiOperation({ summary: 'Download optimized inventory report as Excel' })
    @ApiQuery({ name: 'maxRecords', required: false, type: Number, example: 50 })
    @ApiQuery({
        name: 'category',
        required: false,
        description: 'Filter by book category',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure'],
    })
    @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
    async downloadOptimizedInventoryXLSX(
        @Query('maxRecords') maxRecords: string,
        @Query('category') category: string,
        @Res() res: Response,
    ) {
        try {
            const max = Math.min(parseInt(maxRecords) || 50, 200);
            const reportData = await this.reportsService.generateOptimizedInventoryReport({
                maxRecords: max,
                category,
            });
            const xlsxBuffer = await this.reportsService.generateOptimizedXLSX(reportData);

            const filename = `inventario-optimizado-${Date.now()}.xlsx`;

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', xlsxBuffer.length);

            return res.status(HttpStatus.OK).send(xlsxBuffer);
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    // ENDPOINTS DE CACHE MANAGEMENT (Admin Only)
    
    /**
     * Invalida el cache de reportes
     */
    @Post('cache/clear')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Clear report cache (Admin only)',
        description: 'Invalidates all cached reports or filters by report type. Requires admin authentication.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                reportType: {
                    type: 'string',
                    enum: ['inventory', 'loans', 'inventory-optimized'],
                    description: 'Optional: specific report type to clear. If omitted, clears all cache.',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin authentication required' })
    async clearCache(
        @Body('reportType') reportType: string,
        @AdminEmail() adminEmail: string,
        @Res() res: Response,
    ) {
        try {
            // Validar reportType si se proporciona
            const validTypes = ['inventory', 'loans', 'inventory-optimized'];
            if (reportType && !validTypes.includes(reportType)) {
                throw new BadRequestException(`Invalid reportType. Must be one of: ${validTypes.join(', ')}`);
            }

            const result = await this.reportsService.clearCache(reportType);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: `Cache cleared successfully${reportType ? ` for type: ${reportType}` : ''}`,
                data: {
                    deletedCount: result.deletedCount,
                    reportType: reportType || 'all',
                    clearedBy: adminEmail,
                    clearedAt: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            if (error instanceof BadRequestException) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Obtiene estadísticas del cache
     */
    @Get('cache/stats')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get cache statistics (Admin only)',
        description: 'Returns detailed statistics about the report cache including entry counts, types, and size estimates.',
    })
    @ApiResponse({ status: 200, description: 'Cache stats retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin authentication required' })
    async getCacheStats(
        @AdminEmail() adminEmail: string,
        @Res() res: Response,
    ) {
        try {
            const stats = await this.reportsService.getCacheStats();

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    ...stats,
                    queriedBy: adminEmail,
                    queriedAt: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}