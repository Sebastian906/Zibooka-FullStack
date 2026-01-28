import { BadRequestException, Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report.service';
import type { Response } from 'express';

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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
                    } catch (error) {
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
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}