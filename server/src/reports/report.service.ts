import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Loan } from 'src/loans/schemas/loan.schema';
import { ProductService } from 'src/products/product.service';
import { Product } from 'src/products/schemas/product.schema';
import { Reservation } from 'src/reservations/schemas/reservation.schema';
import { Shelf } from 'src/shelves/schemas/shelf.schema';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { ReportCache } from './schemas/report-cache.schema';

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
     * Genera reporte de inventario en formato PDF
     */
    async generateInventoryPDF(category?: string): Promise<Buffer> {
        try {
            const query = category ? { category } : {};
            const products = await this.productModel.find(query).exec();

            // Obtener datos de recursión si hay categoría específica
            let recursionData: {
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
            } | null = null;

            if (category) {
                const [valueData, weightData] = await Promise.all([
                    this.productsService.calculateTotalValueByCategory(category),
                    this.productsService.calculateAverageWeightByCategory(category),
                ]);
                recursionData = { valueData, weightData };
            }

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    bufferPages: true  // Importante: permite agregar contenido a páginas previas
                });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Función helper para agregar footer
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

                // ============================================
                // HEADER
                // ============================================
                doc.fontSize(20).text('Inventory Report', { align: 'center' });
                doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-US')}`, { align: 'center' });
                if (category) {
                    doc.text(`Category: ${category}`, { align: 'center' });
                }
                doc.moveDown(2);

                // ============================================
                // PRODUCTS TABLE
                // ============================================
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

                products.forEach((product, index) => {
                    // Check if we need a new page
                    if (yPos > 700) {
                        addFooter(); // Agregar footer a la página actual antes de cambiar
                        doc.addPage();
                        yPos = 50;
                    }

                    xPos = 50;
                    const rowData = [
                        product.isbn || 'N/A',
                        product.name.substring(0, 30),
                        product.author?.substring(0, 25) || 'N/A',
                        product.category || 'N/A',
                        `$${product.offerPrice}`,
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

                // ============================================
                // RECURSION ANALYSIS (if category filtered)
                // ============================================
                if (recursionData) {
                    doc.addPage();
                    doc.fontSize(14).font('Helvetica-Bold').text('Recursive Analysis', { underline: true });
                    doc.moveDown();

                    // Stack Recursion
                    doc.fontSize(12).text('Stack Recursion - Total Value');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total books: ${recursionData.valueData.bookCount}`);
                    doc.text(`Total value: $${recursionData.valueData.totalValue.toLocaleString('en-US')} USD`);
                    doc.text(`Average: $${(recursionData.valueData.totalValue / recursionData.valueData.bookCount).toFixed(2)} USD`);
                    doc.moveDown();

                    // Tail Recursion
                    doc.fontSize(12).font('Helvetica-Bold').text('Tail Recursion - Average Weight');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total books: ${recursionData.weightData.bookCount}`);
                    doc.text(`Total weight: ${recursionData.weightData.totalWeight.toFixed(3)} Kg`);
                    doc.text(`Average weight: ${recursionData.weightData.averageWeight.toFixed(3)} Kg`);

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

            // Get products
            const query = category ? { category } : {};
            const products = await this.productModel.find(query).exec();

            // Add data
            let inStockCount = 0;
            products.forEach((product, index) => {
                if (product.inStock) inStockCount++;

                const row = inventorySheet.addRow({
                    isbn: product.isbn || 'N/A',
                    title: product.name,
                    author: product.author || 'N/A',
                    category: product.category || 'N/A',
                    price: product.offerPrice,
                    inStock: product.inStock ? 'Yes' : 'No',
                    pages: product.pageCount || 0,
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
            if (category) {
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

                const [valueData, weightData] = await Promise.all([
                    this.productsService.calculateTotalValueByCategory(category),
                    this.productsService.calculateAverageWeightByCategory(category),
                ]);

                // Stack recursion data
                recursionSheet.addRow({ metric: 'Stack Recursion - Category', value: category });
                recursionSheet.addRow({ metric: 'Total books', value: valueData.bookCount });
                recursionSheet.addRow({ metric: 'Total value (USD)', value: valueData.totalValue });
                recursionSheet.getCell('B4').numFmt = '$#,##0';
                recursionSheet.addRow({ metric: 'Average per book', value: `=B4/B3` });
                recursionSheet.getCell('B5').numFmt = '$#,##0';

                recursionSheet.addRow({});

                // Tail recursion data
                recursionSheet.addRow({ metric: 'Tail Recursion - Category', value: category });
                recursionSheet.addRow({ metric: 'Total books', value: weightData.bookCount });
                recursionSheet.addRow({ metric: 'Total weight (Kg)', value: weightData.totalWeight });
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

            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).text('Loan Report', { align: 'center' });
                doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-US')}`, { align: 'center' });
                if (dateFrom || dateTo) {
                    doc.text(`Period: ${dateFrom?.toLocaleDateString('en-US') || 'Start'} - ${dateTo?.toLocaleDateString('en-US') || 'Today'}`, { align: 'center' });
                }
                doc.moveDown(2);

                // Statistics
                const activeLoans = loans.filter(l => l.status === 'active').length;
                const returnedLoans = loans.filter(l => l.status === 'returned').length;

                doc.fontSize(12).font('Helvetica-Bold').text('Summary');
                doc.fontSize(10).font('Helvetica');
                doc.text(`Total loans: ${loans.length}`);
                doc.text(`Active loans: ${activeLoans}`);
                doc.text(`Returned loans: ${returnedLoans}`);
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

                loans.forEach((loan) => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    xPos = 50;

                    const userName = loan.userId && typeof loan.userId === 'object' && 'name' in loan.userId
                        ? (loan.userId as any).name?.substring(0, 20)
                        : 'N/A';

                    const bookName = loan.bookId && typeof loan.bookId === 'object' && 'name' in loan.bookId
                        ? (loan.bookId as any).name?.substring(0, 30)
                        : 'N/A';

                    const bookIsbn = loan.bookId && typeof loan.bookId === 'object' && 'isbn' in loan.bookId
                        ? (loan.bookId as any).isbn
                        : 'N/A';

                    const rowData = [
                        userName,
                        bookName,
                        bookIsbn,
                        new Date(loan.loanDate).toLocaleDateString('en-US'),
                        loan.status === 'active' ? 'Active' : 'Returned',
                    ];

                    rowData.forEach((data, i) => {
                        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    yPos += 15;
                });

                // Footer - CORREGIDO
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

            // Add data
            loans.forEach((loan, index) => {
                const loanDate = new Date(loan.loanDate);
                const returnDate = loan.returnDate ? new Date(loan.returnDate) : null;

                const userName = loan.userId && typeof loan.userId === 'object' && 'name' in loan.userId
                    ? (loan.userId as any).name
                    : 'N/A';

                const userEmail = loan.userId && typeof loan.userId === 'object' && 'email' in loan.userId
                    ? (loan.userId as any).email
                    : 'N/A';

                const bookName = loan.bookId && typeof loan.bookId === 'object' && 'name' in loan.bookId
                    ? (loan.bookId as any).name
                    : 'N/A';

                const bookIsbn = loan.bookId && typeof loan.bookId === 'object' && 'isbn' in loan.bookId
                    ? (loan.bookId as any).isbn
                    : 'N/A';

                const row = loansSheet.addRow({
                    user: userName,
                    email: userEmail,
                    book: bookName,
                    isbn: bookIsbn,
                    loanDate: loanDate,
                    returnDate: returnDate || '-',
                    status: loan.status === 'active' ? 'Active' : 'Returned',
                    days: returnDate
                        ? `=(F${index + 2}-E${index + 2})`
                        : `=(TODAY()-E${index + 2})`,
                });

                // Date formats
                row.getCell('loanDate').numFmt = 'mm/dd/yyyy';
                if (returnDate) {
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

            const activeCount = loans.filter(l => l.status === 'active').length;
            const returnedCount = loans.filter(l => l.status === 'returned').length;

            statsSheet.addRow({ metric: 'Total loans', value: loans.length });
            statsSheet.addRow({ metric: 'Active loans', value: activeCount });
            statsSheet.addRow({ metric: 'Returned loans', value: returnedCount });
            statsSheet.addRow({ metric: 'Return rate (%)', value: `=B4/B2*100` });
            statsSheet.getCell('B5').numFmt = '0.00"%"';
            statsSheet.addRow({ metric: 'Average days loaned', value: `=AVERAGE(Loans!H:H)` });
            statsSheet.getCell('B6').numFmt = '#,##0';
            statsSheet.getCell('B6').font = { color: { argb: 'FF008000' } };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error: any) {
            console.error('[ReportService] Error generating loans XLSX:', error);
            throw new InternalServerErrorException(`Error generating loans XLSX: ${error.message}`);
        }
    }

    private selectOptimalSubset(
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
            const maxAdditionalValue = sortedItems
                .slice(frame.idx)
                .reduce((sum, item) => sum + item.value, 0);

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
        const cacheKey = `inv_opt_${maxRecords}_${options.category || 'all'}`;

        // Verificar cache
        const cached = await this.reportCacheModel.findOne({ cacheKey }).exec();
        if (cached) {
            return cached.data;
        }

        // Obtener todos los productos
        const allProducts = await this.productModel.find(query).lean().exec();
        const totalCategories = await this.productModel.distinct('category').then(r => r.length);

        // Ejecutar B&B
        const result = this.selectOptimalSubset(allProducts, maxRecords, totalCategories);

        const reportData = {
            mode: 'optimized',
            generatedAt: new Date().toISOString(),
            totalRecords: allProducts.length,
            selectedRecords: result.selectedProducts.length,
            maxRecords,
            categoriesCovered: result.categoriesCovered,
            totalCategories,
            coveragePct: Math.round((result.categoriesCovered / totalCategories) * 100),
            totalValue: result.totalValue,
            products: result.selectedProducts,
            algorithmStats: result.stats,
        };

        // Guardar en cache (TTL 1h via Mongoose)
        await this.reportCacheModel.updateOne(
            { cacheKey },
            { $set: { reportType: 'inventory', filters: query, data: reportData } },
            { upsert: true }
        ).exec();

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
}