import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { Loan } from 'src/loans/schemas/loan.schema';
import { ProductService } from 'src/products/product.service';
import { Product } from 'src/products/schemas/product.schema';
import { Reservation } from 'src/reservations/schemas/reservation.schema';
import { Shelf } from 'src/shelves/schemas/shelf.schema';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ReportCache } from './schemas/report-cache.schema';

// Interfaces para tipado fuerte
export interface InventoryReportData {
    category?: string;
    products: Array<{
        isbn: string;
        name: string;
        author: string;
        category: string;
        price: number;
        inStock: boolean;
        pageCount: number;
    }>;
    recursionData?: {
        valueData: {
            category: string;
            totalValue: number;
            bookCount: number;
            executionLog: string[];
        };
        weightData: {
            category: string;
            averageWeight: number;
            totalWeight: number;
            bookCount: number;
            executionLog: string[];
        };
    };
    generatedAt: string;
}

export interface LoansReportData {
    dateFrom?: string;
    dateTo?: string;
    loans: Array<{
        userName: string;
        userEmail: string;
        bookName: string;
        bookIsbn: string;
        loanDate: string;
        returnDate: string | null;
        status: 'active' | 'returned';
    }>;
    statistics: {
        total: number;
        active: number;
        returned: number;
    };
    generatedAt: string;
}

export interface ReportResponse<T> {
    data: T;
    _cached: boolean;
    _cachedAt?: Date;
    _generationTimeMs: number;
}

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(Loan.name) private loanModel: Model<Loan>,
        @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
        @InjectModel(Shelf.name) private shelfModel: Model<Shelf>,
        @InjectModel(ReportCache.name) private reportCacheModel: Model<ReportCache>,
        private productsService: ProductService,
    ) { }

    /**
    * Genera una cache key basada en MD5 hash de reportType + filters
    */
    private generateCacheKey(reportType: string, filters: Record<string, any>): string {
        // Ordenar keys para consistencia
        const sortedFilters = Object.keys(filters)
            .sort()
            .reduce((acc, key) => {
                acc[key] = filters[key];
                return acc;
            }, {} as Record<string, any>);

        const data = `${reportType}_${JSON.stringify(sortedFilters)}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Obtiene datos del cache o retorna null si no existe o expiró
     */
    private async getFromCache<T>(cacheKey: string): Promise<{ data: T; cachedAt: Date } | null> {
        const cached = await this.reportCacheModel.findOne({ cacheKey }).exec();

        if (cached && cached.expiresAt > new Date()) {
            return {
                data: cached.data as T,
                cachedAt: (cached as any).updatedAt ?? cached.expiresAt,
            };
        }

        return null;
    }

    /**
     * Guarda datos en el cache con TTL de 24 horas
     */
    private async setCache(
        cacheKey: string,
        reportType: string,
        filters: Record<string, any>,
        data: any,
        recordCount: number,
        generationTimeMs: number
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        await this.reportCacheModel.updateOne(
            { cacheKey },
            {
                $set: {
                    reportType,
                    filters,
                    data,
                    recordCount,
                    generationTimeMs,
                    expiresAt,
                }
            },
            { upsert: true }
        ).exec();
    }

    /**
     * Genera datos de inventario (sin renderizar)
     */
    async getInventoryData(category?: string): Promise<InventoryReportData> {
        const cacheKey = this.generateCacheKey('inventory', { category: category || 'all' });

        // Verificar cache
        const cached = await this.getFromCache<InventoryReportData>(cacheKey);
        if (cached) {
            return cached.data;
        }

        const startTime = Date.now();
        const query = category ? { category } : {};
        const products = await this.productModel.find(query).exec();

        // Obtener datos de recursión si hay categoría específica
        let recursionData: InventoryReportData['recursionData'] = undefined;

        if (category) {
            const [valueData, weightData] = await Promise.all([
                this.productsService.calculateTotalValueByCategory(category),
                this.productsService.calculateAverageWeightByCategory(category),
            ]);
            recursionData = { valueData, weightData };
        }

        const reportData: InventoryReportData = {
            category,
            products: products.map(p => ({
                isbn: p.isbn || 'N/A',
                name: p.name || 'N/A',
                author: p.author || 'N/A',
                category: p.category || 'N/A',
                price: p.offerPrice,
                inStock: p.inStock,
                pageCount: p.pageCount || 0,
            })),
            recursionData,
            generatedAt: new Date().toISOString(),
        };

        const generationTimeMs = Date.now() - startTime;

        // Guardar en cache
        await this.setCache(cacheKey, 'inventory', { category: category || 'all' }, reportData, products.length, generationTimeMs);

        return reportData;
    }

    /**
     * Genera datos de préstamos (sin renderizar)
     */
    async getLoansData(dateFrom?: Date, dateTo?: Date): Promise<LoansReportData> {
        const filters: Record<string, any> = {
            dateFrom: dateFrom?.toISOString() || 'none',
            dateTo: dateTo?.toISOString() || 'none',
        };
        const cacheKey = this.generateCacheKey('loans', filters);

        // Verificar cache
        const cached = await this.getFromCache<LoansReportData>(cacheKey);
        if (cached) {
            return cached.data;
        }

        const startTime = Date.now();
        const query: any = {};
        if (dateFrom || dateTo) {
            query.loanDate = {};
            if (dateFrom) query.loanDate.$gte = dateFrom;
            if (dateTo) query.loanDate.$lte = dateTo;
        }

        const loans = await this.loanModel
            .find(query)
            .populate('userId', 'name email')
            .populate('bookId', 'name isbn')
            .exec();

        const activeLoans = loans.filter(l => l.status === 'active').length;
        const returnedLoans = loans.filter(l => l.status === 'returned').length;

        const reportData: LoansReportData = {
            dateFrom: dateFrom?.toISOString(),
            dateTo: dateTo?.toISOString(),
            loans: loans.map(loan => ({
                userName: loan.userId && typeof loan.userId === 'object' && 'name' in loan.userId
                    ? (loan.userId as any).name?.substring(0, 20) || 'N/A'
                    : 'N/A',
                userEmail: loan.userId && typeof loan.userId === 'object' && 'email' in loan.userId
                    ? (loan.userId as any).email || 'N/A'
                    : 'N/A',
                bookName: loan.bookId && typeof loan.bookId === 'object' && 'name' in loan.bookId
                    ? (loan.bookId as any).name?.substring(0, 30) || 'N/A'
                    : 'N/A',
                bookIsbn: loan.bookId && typeof loan.bookId === 'object' && 'isbn' in loan.bookId
                    ? (loan.bookId as any).isbn || 'N/A'
                    : 'N/A',
                loanDate: new Date(loan.loanDate).toLocaleDateString('en-US'),
                returnDate: loan.returnDate ? new Date(loan.returnDate).toLocaleDateString('en-US') : null,
                status: loan.status === 'active' ? 'active' : 'returned',
            })),
            statistics: {
                total: loans.length,
                active: activeLoans,
                returned: returnedLoans,
            },
            generatedAt: new Date().toISOString(),
        };

        const generationTimeMs = Date.now() - startTime;

        // Guardar en cache
        await this.setCache(cacheKey, 'loans', filters, reportData, loans.length, generationTimeMs);

        return reportData;
    }

    /**
     * Genera reporte de inventario en formato PDF
     */
    async generateInventoryPDF(category?: string): Promise<Buffer> {
        try {
            // Obtener datos cacheados
            const reportData = await this.getInventoryData(category);

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true
                });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const addFooter = () => {
                    const pageNumber = doc.bufferedPageRange().count;
                    doc.fontSize(8).font('Helvetica').text(
                        `Page ${pageNumber}`,
                        50,
                        doc.page.height - 50,
                        {
                            align: 'center',
                            width: doc.page.width - 100
                        }
                    );
                };

                // HEADER
                doc.fontSize(20).text('Inventory Report', { align: 'center' });
                doc.fontSize(10).text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString('en-US')}`, { align: 'center' });
                if (reportData.category) {
                    doc.text(`Category: ${reportData.category}`, { align: 'center' });
                }
                doc.moveDown(2);

                // PRODUCTS TABLE
                doc.fontSize(14).text('Products', { underline: true });
                doc.moveDown();

                const tableTop = doc.y;
                const tableHeaders = ['ISBN', 'Title', 'Author', 'Category', 'Price', 'In Stock'];
                const colWidths = [80, 150, 120, 80, 60, 50];
                let xPos = 50;

                // Headers
                doc.fontSize(9).font('Helvetica-Bold');
                tableHeaders.forEach((header, i) => {
                    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                    xPos += colWidths[i];
                });

                // Separator line
                doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

                // Data rows
                let yPos = tableTop + 20;
                doc.font('Helvetica').fontSize(8);

                reportData.products.forEach((product, index) => {
                    // Check if we need a new page
                    if (yPos > 700) {
                        addFooter(); // Agregar footer a la página actual antes de cambiar
                        doc.addPage();
                        yPos = 50;
                    }

                    xPos = 50;
                    const rowData = [
                        product.isbn,
                        product.name.substring(0, 30),
                        product.author.substring(0, 25),
                        product.category,
                        `$${product.price}`,
                        product.inStock ? 'Yes' : 'No',
                    ];

                    rowData.forEach((data, i) => {
                        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    yPos += 15;
                });

                // Agregar footer a la última página de productos
                addFooter();

                // RECURSION ANALYSIS (if category filtered)
                if (reportData.recursionData) {
                    doc.addPage();
                    doc.fontSize(14).font('Helvetica-Bold').text('Recursive Analysis', { underline: true });
                    doc.moveDown();

                    // Stack Recursion
                    doc.fontSize(12).text('Stack Recursion - Total Value');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total books: ${reportData.recursionData.valueData.bookCount}`);
                    doc.text(`Total value: $${reportData.recursionData.valueData.totalValue.toLocaleString('en-US')} USD`);
                    doc.text(`Average: $${(reportData.recursionData.valueData.totalValue / reportData.recursionData.valueData.bookCount).toFixed(2)} USD`);
                    doc.moveDown();

                    // Tail Recursion
                    doc.fontSize(12).font('Helvetica-Bold').text('Tail Recursion - Average Weight');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total books: ${reportData.recursionData.weightData.bookCount}`);
                    doc.text(`Total weight: ${reportData.recursionData.weightData.totalWeight.toFixed(3)} Kg`);
                    doc.text(`Average weight: ${reportData.recursionData.weightData.averageWeight.toFixed(3)} Kg`);

                    // Footer para la página de recursión
                    addFooter();
                }

                // Finalizar el documento
                doc.end();
            });
        } catch (error: any) {
            console.error('[ReportService] Error generating inventory PDF:', error);
            throw new InternalServerErrorException(`Error generating PDF: ${error.message}`);
        }
    }

    /**
     * Genera reporte de inventario en formato XLSX
     */
    async generateInventoryXLSX(category?: string): Promise<Buffer> {
        try {
            // Obtener datos cacheados
            const reportData = await this.getInventoryData(category);

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Digital Library';
            workbook.created = new Date();

            // Sheet 1: Inventory
            const inventorySheet = workbook.addWorksheet('Inventory');

            // Configure columns
            inventorySheet.columns = [
                { header: 'ISBN', key: 'isbn', width: 15 },
                { header: 'Title', key: 'title', width: 40 },
                { header: 'Author', key: 'author', width: 30 },
                { header: 'Category', key: 'category', width: 15 },
                { header: 'Price (USD)', key: 'price', width: 15 },
                { header: 'In Stock', key: 'inStock', width: 10 },
                { header: 'Pages', key: 'pages', width: 10 },
            ];

            // Header style
            const headerRow = inventorySheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // // Get products
            // const query = category ? { category } : {};
            // const products = await this.productModel.find(query).exec();

            // Add data
            let inStockCount = 0;
            reportData.products.forEach((product) => {
                if (product.inStock) inStockCount++;

                const row = inventorySheet.addRow({
                    isbn: product.isbn,
                    title: product.name,
                    author: product.author,
                    category: product.category,
                    price: product.price,
                    inStock: product.inStock ? 'Yes' : 'No',
                    pages: product.pageCount,
                });

                // Currency format for prices
                row.getCell('price').numFmt = '$#,##0';
            });

            // Totals row
            const lastRow = inventorySheet.rowCount + 1;
            const totalRow = inventorySheet.addRow({
                isbn: '',
                title: '',
                author: '',
                category: 'TOTAL',
                price: `=AVERAGE(E2:E${lastRow - 1})`,
                inStock: `${inStockCount} in stock`,
                pages: `=SUM(G2:G${lastRow - 1})`,
            });

            totalRow.font = { bold: true };
            totalRow.getCell('price').numFmt = '$#,##0';
            totalRow.getCell('pages').numFmt = '#,##0';
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF000' },
            };

            // Sheet 2: Recursion (if category specified)
            if (reportData.recursionData) {
                const recursionSheet = workbook.addWorksheet('Recursion');

                recursionSheet.columns = [
                    { header: 'Metric', key: 'metric', width: 30 },
                    { header: 'Value', key: 'value', width: 20 },
                ];

                // Header
                const recHeaderRow = recursionSheet.getRow(1);
                recHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                recHeaderRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' },
                };

                // Stack recursion data
                recursionSheet.addRow({ metric: 'Stack Recursion - Category', value: reportData.category });
                recursionSheet.addRow({ metric: 'Total books', value: reportData.recursionData.valueData.bookCount });
                recursionSheet.addRow({ metric: 'Total value (USD)', value: reportData.recursionData.valueData.totalValue });
                recursionSheet.getCell('B4').numFmt = '$#,##0';
                recursionSheet.addRow({ metric: 'Average per book', value: `=B4/B3` });
                recursionSheet.getCell('B5').numFmt = '$#,##0';

                recursionSheet.addRow({});

                // Tail recursion data
                recursionSheet.addRow({ metric: 'Tail Recursion - Category', value: reportData.category });
                recursionSheet.addRow({ metric: 'Total books', value: reportData.recursionData.weightData.bookCount });
                recursionSheet.addRow({ metric: 'Total weight (Kg)', value: reportData.recursionData.weightData.totalWeight });
                recursionSheet.addRow({ metric: 'Average weight (Kg)', value: `=B9/B8` });
                recursionSheet.getCell('B10').numFmt = '0.000';
            }

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error: any) {
            console.error('[ReportService] Error generating inventory XLSX:', error);
            throw new InternalServerErrorException(`Error generating XLSX: ${error.message}`);
        }
    }

    /**
     * Genera reporte de préstamos en formato PDF
     */
    async generateLoansPDF(dateFrom?: Date, dateTo?: Date): Promise<Buffer> {
        try {
            // Obtener datos cacheados
            const reportData = await this.getLoansData(dateFrom, dateTo);

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).text('Loan Report', { align: 'center' });
                doc.fontSize(10).text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString('en-US')}`, { align: 'center' });
                if (reportData.dateFrom || reportData.dateTo) {
                    doc.text(`Period: ${reportData.dateFrom || 'Start'} - ${reportData.dateTo || 'Today'}`, { align: 'center' });
                }
                doc.moveDown(2);

                // Statistics
                doc.fontSize(12).font('Helvetica-Bold').text('Summary');
                doc.fontSize(10).font('Helvetica');
                doc.text(`Total loans: ${reportData.statistics.total}`);
                doc.text(`Active loans: ${reportData.statistics.active}`);
                doc.text(`Returned loans: ${reportData.statistics.returned}`);
                doc.moveDown();

                // Loans table
                doc.fontSize(14).font('Helvetica-Bold').text('Loan Details', { underline: true });
                doc.moveDown();

                const tableTop = doc.y;
                const tableHeaders = ['User', 'Book', 'ISBN', 'Loan Date', 'Status'];
                const colWidths = [120, 150, 80, 90, 80];
                let xPos = 50;

                // Headers
                doc.fontSize(9).font('Helvetica-Bold');
                tableHeaders.forEach((header, i) => {
                    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                    xPos += colWidths[i];
                });

                doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

                // Data
                let yPos = tableTop + 20;
                doc.font('Helvetica').fontSize(8);

                reportData.loans.forEach((loan) => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    xPos = 50;

                    const rowData = [
                        loan.userName,
                        loan.bookName,
                        loan.bookIsbn,
                        loan.loanDate,
                        loan.status === 'active' ? 'Active' : 'Returned',
                    ];

                    rowData.forEach((data, i) => {
                        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    yPos += 15;
                });

                // Footer
                const pageRange = doc.bufferedPageRange();
                const totalPages = pageRange.count;

                for (let i = 0; i < totalPages; i++) {
                    doc.switchToPage(i);

                    const pageNumber = i + 1;
                    doc.fontSize(8).text(
                        `Page ${pageNumber} of ${totalPages}`,
                        50,
                        doc.page.height - 50,
                        { align: 'center', width: doc.page.width - 100 }
                    );
                }

                doc.end();
            });
        } catch (error: any) {
            console.error('[ReportService] Error generating loans PDF:', error);
            throw new InternalServerErrorException(`Error generating loans PDF: ${error.message}`);
        }
    }

    /**
     * Genera reporte de préstamos en formato XLSX
     */
    async generateLoansXLSX(dateFrom?: Date, dateTo?: Date): Promise<Buffer> {
        try {
            // Obtener datos cacheados
            const reportData = await this.getLoansData(dateFrom, dateTo);

            const workbook = new ExcelJS.Workbook();
            const loansSheet = workbook.addWorksheet('Loans');

            // Configure columns
            loansSheet.columns = [
                { header: 'User', key: 'user', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Book', key: 'book', width: 40 },
                { header: 'ISBN', key: 'isbn', width: 15 },
                { header: 'Loan Date', key: 'loanDate', width: 15 },
                { header: 'Return Date', key: 'returnDate', width: 15 },
                { header: 'Status', key: 'status', width: 12 },
                { header: 'Days Loaned', key: 'days', width: 15 },
            ];

            // Header
            const headerRow = loansSheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };

            // Get loans
            reportData.loans.forEach((loan, index) => {
                const row = loansSheet.addRow({
                    user: loan.userName,
                    email: loan.userEmail,
                    book: loan.bookName,
                    isbn: loan.bookIsbn,
                    loanDate: new Date(loan.loanDate),
                    returnDate: loan.returnDate ? new Date(loan.returnDate) : '-',
                    status: loan.status === 'active' ? 'Active' : 'Returned',
                    days: loan.returnDate
                        ? `=(F${index + 2}-E${index + 2})`
                        : `=(TODAY()-E${index + 2})`,
                });

                row.getCell('loanDate').numFmt = 'mm/dd/yyyy';
                if (loan.returnDate) {
                    row.getCell('returnDate').numFmt = 'mm/dd/yyyy';
                }
                row.getCell('days').numFmt = '#,##0';
            });

            // Statistics sheet
            const statsSheet = workbook.addWorksheet('Statistics');

            statsSheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 15 },
            ];

            const statsHeaderRow = statsSheet.getRow(1);
            statsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            statsHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };

            statsSheet.addRow({ metric: 'Total loans', value: reportData.statistics.total });
            statsSheet.addRow({ metric: 'Active loans', value: reportData.statistics.active });
            statsSheet.addRow({ metric: 'Returned loans', value: reportData.statistics.returned });
            statsSheet.addRow({ metric: 'Return rate (%)', value: `=B4/B2*100` });
            statsSheet.getCell('B5').numFmt = '0.00"%"';

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error: any) {
            console.error('[ReportService] Error generating loans XLSX:', error);
            throw new InternalServerErrorException(`Error generating XLSX: ${error.message}`);
        }
    }

    /**
     * Genera datos del reporte optimizado (Branch & Bound)
     */
    private async selectOptimalSubset(
        products: any[],
        maxRecords: number,
        totalCategories: number
    ) {

        // Pre-procesamiento
        const items = products.map(p => ({
            id: p._id.toString(),
            category: p.category,
            value: p.offerPrice || p.price,
            title: p.name,
        }));

        const sortedItems = [...items].sort((a, b) => b.value - a.value);
        const allCategories = [...new Set(items.map(i => i.category))];
        const totalPossibleValue = items.reduce((s, i) => s + i.value, 0);

        // suffixSum[i] = sum of sortedItems[i..end].value
        const suffixSum = new Array(sortedItems.length + 1).fill(0);

        for (let i = sortedItems.length - 1; i >= 0; i--) {
            suffixSum[i] = suffixSum[i + 1] + sortedItems[i].value;
        }

        let bestScore = -1;
        let bestSelection: any[] = [];
        let nodesExplored = 0;
        let nodesPruned = 0;

        // Stack explícito en lugar de recursión
        type StackFrame = {
            idx: number;
            selected: any[];
            coveredCategories: Set<string>;
            accumulatedValue: number;
        };

        const stack: StackFrame[] = [{
            idx: 0,
            selected: [],
            coveredCategories: new Set(),
            accumulatedValue: 0
        }];

        while (stack.length > 0) {
            const frame = stack.pop()!;
            nodesExplored++;

            // Calcular score actual
            const categoriesCovered = frame.coveredCategories.size;
            const coverageScore = categoriesCovered / Math.max(totalCategories, 1);
            const valueScore = totalPossibleValue > 0
                ? frame.accumulatedValue / totalPossibleValue
                : 0;

            const currentScore = (0.7 * coverageScore) + (0.3 * valueScore);

            // Evaluar si es mejor solución
            if (frame.selected.length > 0 && currentScore > bestScore) {
                bestScore = currentScore;
                bestSelection = [...frame.selected];
            }

            // Condiciones de parada
            if (frame.idx >= sortedItems.length || frame.selected.length >= maxRecords) {
                continue;
            }

            // Upper bound (estimación optimista)
            const remainingCategories = allCategories.filter(
                c => !frame.coveredCategories.has(c)
            );
            const maxAdditionalValue = suffixSum[frame.idx];
            const optimisticCoverage = Math.min(1,
                (categoriesCovered + remainingCategories.length) / Math.max(totalCategories, 1)
            );
            const optimisticValue = totalPossibleValue > 0
                ? (frame.accumulatedValue + maxAdditionalValue) / totalPossibleValue
                : 0;
            const upperBound = (0.7 * optimisticCoverage) + (0.3 * optimisticValue);

            // PODA
            if (upperBound <= bestScore) {
                nodesPruned++;
                continue;
            }

            const item = sortedItems[frame.idx];

            // Opción 1: Tomar el producto (push primero = se explora después = DFS)
            if (frame.selected.length < maxRecords) {
                const newCategories = new Set(frame.coveredCategories);
                newCategories.add(item.category);
                stack.push({
                    idx: frame.idx + 1,
                    selected: [...frame.selected, item],
                    coveredCategories: newCategories,
                    accumulatedValue: frame.accumulatedValue + item.value,
                });
            }

            // Opción 2: No tomar el producto
            stack.push({
                idx: frame.idx + 1,
                selected: frame.selected,
                coveredCategories: frame.coveredCategories,
                accumulatedValue: frame.accumulatedValue,
            });
        }

        return {
            selectedProducts: bestSelection,
            categoriesCovered: new Set(bestSelection.map(p => p.category)).size,
            totalValue: bestSelection.reduce((s, p) => s + p.value, 0),
            stats: {
                nodesExplored,
                nodesPruned,
                prunedPercentage: nodesExplored > 0
                    ? Math.round((nodesPruned / nodesExplored) * 100)
                    : 0,
                bestScore: Math.round(bestScore * 10000) / 10000
            }
        };
    }

    async generateOptimizedInventoryReport(options: {
        maxRecords?: number;
        category?: string;
    }): Promise<any> {
        const maxRecords = Math.min(options.maxRecords || 50, 200); // Cap de seguridad
        const query = options.category ? { category: options.category } : {};

        // Cache key
        const cacheKey = this.generateCacheKey('inventory-optimized', {
            maxRecords,
            category: options.category || 'all'
        });

        // Verificar cache
        const cached = await this.getFromCache<any>(cacheKey);
        if (cached) {
            return cached.data;
        }

        // Obtener todos los productos
        const startTime = Date.now();
        const allProducts = await this.productModel.find(query).lean().exec();
        const totalCategories = await this.productModel.distinct('category', query).then(r => r.length);

        // Ejecutar B&B
        const result = this.selectOptimalSubset(allProducts, maxRecords, totalCategories);

        const reportData = {
            mode: 'optimized',
            generatedAt: new Date().toISOString(),
            totalRecords: allProducts.length,
            selectedRecords: (await result).selectedProducts.length,
            maxRecords,
            categoriesCovered: (await result).categoriesCovered,
            totalCategories,
            coveragePct: Math.round(((await result).categoriesCovered / totalCategories) * 100),
            totalValue: (await result).totalValue,
            products: (await result).selectedProducts,
            algorithmStats: (await result).stats,
        };

        const generationTimeMs = Date.now() - startTime;

        // Guardar en cache (TTL 1h via Mongoose)
        await this.setCache(cacheKey, 'inventory-optimized', { maxRecords, category: options.category || 'all' }, reportData, allProducts.length, generationTimeMs);

        return reportData;
    }

    /**
     * Genera PDF a partir de datos del reporte optimizado
    */
    async generateOptimizedPDF(reportData: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).text('Optimized Inventory Report', { align: 'center' });
            doc.fontSize(10).text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString('en-US')}`, { align: 'center' });
            doc.moveDown();

            // Summary
            doc.fontSize(12).font('Helvetica-Bold').text('Summary');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Mode: Optimized (Branch & Bound)`);
            doc.text(`Total products in catalog: ${reportData.totalRecords}`);
            doc.text(`Products selected: ${reportData.selectedRecords} of ${reportData.maxRecords} max`);
            doc.text(`Categories covered: ${reportData.categoriesCovered} of ${reportData.totalCategories} (${reportData.coveragePct}%)`);
            doc.text(`Total inventory value (selected): $${reportData.totalValue.toLocaleString('en-US')}`);
            doc.moveDown();

            // Products table
            doc.fontSize(14).font('Helvetica-Bold').text('Selected Products', { underline: true });
            doc.moveDown();

            const tableTop = doc.y;
            const tableHeaders = ['#', 'Title', 'Category', 'Price'];
            const colWidths = [30, 250, 100, 80];
            let xPos = 50;

            doc.fontSize(9).font('Helvetica-Bold');
            tableHeaders.forEach((header, i) => {
                doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                xPos += colWidths[i];
            });

            doc.moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke();

            let yPos = tableTop + 20;
            doc.font('Helvetica').fontSize(8);

            reportData.products.forEach((product: any, index: number) => {
                if (yPos > 700) {
                    doc.addPage();
                    yPos = 50;
                }

                xPos = 50;
                const rowData = [
                    (index + 1).toString(),
                    (product.title || 'N/A').substring(0, 40),
                    product.category || 'N/A',
                    `$${product.value}`,
                ];

                rowData.forEach((data, i) => {
                    doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                    xPos += colWidths[i];
                });

                yPos += 15;
            });

            doc.end();
        });
    }

    /**
     * Genera XLSX a partir de datos del reporte optimizado
     */
    async generateOptimizedXLSX(reportData: any): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Digital Library';
        workbook.created = new Date();

        // Hoja 1: Productos seleccionados
        const sheet = workbook.addWorksheet('Optimized Inventory');

        sheet.columns = [
            { header: '#', key: 'index', width: 5 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Price (USD)', key: 'price', width: 15 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF7C3AED' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        reportData.products.forEach((product: any, index: number) => {
            const row = sheet.addRow({
                index: index + 1,
                title: product.title || 'N/A',
                category: product.category || 'N/A',
                price: product.value,
            });
            row.getCell('price').numFmt = '$#,##0';
        });

        // Hoja 2: Resumen
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 35 },
            { header: 'Value', key: 'value', width: 20 },
        ];

        const summaryHeader = summarySheet.getRow(1);
        summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summaryHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF7C3AED' },
        };

        summarySheet.addRow({ metric: 'Mode', value: 'Optimized (B&B)' });
        summarySheet.addRow({ metric: 'Total products', value: reportData.totalRecords });
        summarySheet.addRow({ metric: 'Products selected', value: reportData.selectedRecords });
        summarySheet.addRow({ metric: 'Max records limit', value: reportData.maxRecords });
        summarySheet.addRow({ metric: 'Categories covered', value: reportData.categoriesCovered });
        summarySheet.addRow({ metric: 'Total categories', value: reportData.totalCategories });
        summarySheet.addRow({ metric: 'Coverage %', value: `${reportData.coveragePct}%` });
        summarySheet.addRow({ metric: 'Total value (USD)', value: reportData.totalValue });
        summarySheet.getCell('B9').numFmt = '$#,##0';

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    /**
     * Invalida todo el cache de reportes o por tipo específico
     */
    async clearCache(reportType?: string): Promise<{ deletedCount: number }> {
        const filter: any = {};
        if (reportType) {
            filter.reportType = reportType;
        }

        const result = await this.reportCacheModel.deleteMany(filter).exec();
        return { deletedCount: result.deletedCount };
    }

    /**
     * Obtiene estadísticas del cache
     */
    async getCacheStats(): Promise<{
        totalEntries: number;
        byType: Record<string, number>;
        oldestEntry: Date | null;
        newestEntry: Date | null;
        totalSizeEstimateKB: number;
    }> {
        const totalEntries = await this.reportCacheModel.countDocuments().exec();

        // Contar por tipo
        const typeAggregation = await this.reportCacheModel.aggregate([
            { $group: { _id: '$reportType', count: { $sum: 1 } } }
        ]).exec();

        const byType: Record<string, number> = {};
        typeAggregation.forEach(item => {
            byType[item._id] = item.count;
        });

        // Obtener entradas más antigua y nueva
        const oldest = await this.reportCacheModel.findOne().sort({ createdAt: 1 }).exec();
        const newest = await this.reportCacheModel.findOne().sort({ createdAt: -1 }).exec();

        // Estimación de tamaño (promedio 1KB por entrada como estimación conservadora)
        const totalSizeEstimateKB = totalEntries * 1;

        return {
            totalEntries,
            byType,
            oldestEntry: oldest?.createdAt || null,
            newestEntry: newest?.createdAt || null,
            totalSizeEstimateKB,
        };
    }
}