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

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(Loan.name) private loanModel: Model<Loan>,
        @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
        @InjectModel(Shelf.name) private shelfModel: Model<Shelf>,
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
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Header
                doc.fontSize(20).text('Reporte de Inventario', { align: 'center' });
                doc.fontSize(10).text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
                if (category) {
                    doc.text(`Categoría: ${category}`, { align: 'center' });
                }
                doc.moveDown(2);

                // Tabla de productos
                doc.fontSize(14).text('Productos', { underline: true });
                doc.moveDown();

                const tableTop = doc.y;
                const tableHeaders = ['ISBN', 'Título', 'Autor', 'Categoría', 'Precio', 'En Stock'];
                const colWidths = [80, 150, 120, 80, 60, 50];
                let xPos = 50;

                // Headers
                doc.fontSize(9).font('Helvetica-Bold');
                tableHeaders.forEach((header, i) => {
                    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                    xPos += colWidths[i];
                });

                // Línea separadora
                doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

                // Datos
                let yPos = tableTop + 20;
                doc.font('Helvetica').fontSize(8);

                products.forEach((product) => {
                    if (yPos > 700) {
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
                        product.inStock ? 'Sí' : 'No',
                    ];

                    rowData.forEach((data, i) => {
                        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    yPos += 15;
                });

                // Sección de recursión si existe
                if (recursionData) {
                    doc.addPage();
                    doc.fontSize(14).font('Helvetica-Bold').text('Análisis Recursivo', { underline: true });
                    doc.moveDown();

                    doc.fontSize(12).text('Recursión de Pila - Valor Total');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total de libros: ${recursionData.valueData.bookCount}`);
                    doc.text(`Valor total: $${recursionData.valueData.totalValue.toLocaleString('es-CO')} COP`);
                    doc.text(`Promedio: $${(recursionData.valueData.totalValue / recursionData.valueData.bookCount).toFixed(2)} COP`);
                    doc.moveDown();

                    doc.fontSize(12).font('Helvetica-Bold').text('Recursión de Cola - Peso Promedio');
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Total de libros: ${recursionData.weightData.bookCount}`);
                    doc.text(`Peso total: ${recursionData.weightData.totalWeight} Kg`);
                    doc.text(`Peso promedio: ${recursionData.weightData.averageWeight} Kg`);
                }

                // Footer
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    doc.fontSize(8).text(
                        `Página ${i + 1} de ${pages.count}`,
                        50,
                        doc.page.height - 50,
                        { align: 'center' }
                    );
                }

                doc.end();
            });
        } catch (error) {
            throw new InternalServerErrorException(`Error generating PDF: ${error.message}`);
        }
    }

    /**
     * Genera reporte de inventario en formato XLSX
     */
    async generateInventoryXLSX(category?: string): Promise<Buffer> {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Biblioteca Digital';
            workbook.created = new Date();

            // Hoja 1: Inventario
            const inventorySheet = workbook.addWorksheet('Inventario');

            // Configurar columnas
            inventorySheet.columns = [
                { header: 'ISBN', key: 'isbn', width: 15 },
                { header: 'Título', key: 'title', width: 40 },
                { header: 'Autor', key: 'author', width: 30 },
                { header: 'Categoría', key: 'category', width: 15 },
                { header: 'Precio (COP)', key: 'price', width: 15 },
                { header: 'En Stock', key: 'inStock', width: 10 },
                { header: 'Páginas', key: 'pages', width: 10 },
            ];

            // Estilo del header (azul para inputs según el skill)
            const headerRow = inventorySheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }, // Azul
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // Obtener productos
            const query = category ? { category } : {};
            const products = await this.productModel.find(query).exec();

            // Agregar datos
            let inStockCount = 0;
            products.forEach((product, index) => {
                const isInStock = product.inStock ? 1 : 0;
                if (product.inStock) inStockCount++;

                const row = inventorySheet.addRow({
                    isbn: product.isbn || 'N/A',
                    title: product.name,
                    author: product.author || 'N/A',
                    category: product.category || 'N/A',
                    price: product.offerPrice,
                    inStock: product.inStock ? 'Sí' : 'No',
                    pages: product.pageCount || 0,
                });

                // Formato de moneda para precios (negro para fórmulas)
                row.getCell('price').numFmt = '$#,##0';
            });

            // Fila de totales
            const lastRow = inventorySheet.rowCount + 1;
            const totalRow = inventorySheet.addRow({
                isbn: '',
                title: '',
                author: '',
                category: 'TOTAL',
                price: `=AVERAGE(E2:E${lastRow - 1})`, // Promedio de precios
                inStock: `${inStockCount} en stock`,
                pages: `=SUM(G2:G${lastRow - 1})`, // Total de páginas
            });

            totalRow.font = { bold: true };
            totalRow.getCell('price').numFmt = '$#,##0';
            totalRow.getCell('pages').numFmt = '#,##0';
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF000' }, // Amarillo para atención
            };

            // Hoja 2: Recursión (si hay categoría)
            if (category) {
                const recursionSheet = workbook.addWorksheet('Recursión');

                recursionSheet.columns = [
                    { header: 'Métrica', key: 'metric', width: 30 },
                    { header: 'Valor', key: 'value', width: 20 },
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

                // Datos de recursión de pila
                recursionSheet.addRow({ metric: 'Recursión de Pila - Categoría', value: category });
                recursionSheet.addRow({ metric: 'Total de libros', value: valueData.bookCount });
                recursionSheet.addRow({ metric: 'Valor total (COP)', value: valueData.totalValue });
                recursionSheet.getCell('B4').numFmt = '$#,##0';
                recursionSheet.addRow({ metric: 'Promedio por libro', value: `=B4/B3` }); // Fórmula
                recursionSheet.getCell('B5').numFmt = '$#,##0';

                recursionSheet.addRow({}); // Espacio

                // Datos de recursión de cola
                recursionSheet.addRow({ metric: 'Recursión de Cola - Categoría', value: category });
                recursionSheet.addRow({ metric: 'Total de libros', value: weightData.bookCount });
                recursionSheet.addRow({ metric: 'Peso total (Kg)', value: weightData.totalWeight });
                recursionSheet.addRow({ metric: 'Peso promedio (Kg)', value: `=B9/B8` }); // Fórmula
                recursionSheet.getCell('B10').numFmt = '0.000';
            }

            // Generar buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
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
                doc.fontSize(20).text('Reporte de Préstamos', { align: 'center' });
                doc.fontSize(10).text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
                if (dateFrom || dateTo) {
                    doc.text(`Período: ${dateFrom?.toLocaleDateString('es-CO') || 'Inicio'} - ${dateTo?.toLocaleDateString('es-CO') || 'Hoy'}`, { align: 'center' });
                }
                doc.moveDown(2);

                // Estadísticas
                const activeLoans = loans.filter(l => l.status === 'active').length;
                const returnedLoans = loans.filter(l => l.status === 'returned').length;

                doc.fontSize(12).font('Helvetica-Bold').text('Resumen');
                doc.fontSize(10).font('Helvetica');
                doc.text(`Total de préstamos: ${loans.length}`);
                doc.text(`Préstamos activos: ${activeLoans}`);
                doc.text(`Préstamos devueltos: ${returnedLoans}`);
                doc.moveDown();

                // Tabla de préstamos
                doc.fontSize(14).font('Helvetica-Bold').text('Detalle de Préstamos', { underline: true });
                doc.moveDown();

                const tableTop = doc.y;
                const tableHeaders = ['Usuario', 'Libro', 'ISBN', 'Fecha Préstamo', 'Estado'];
                const colWidths = [120, 150, 80, 90, 80];
                let xPos = 50;

                // Headers
                doc.fontSize(9).font('Helvetica-Bold');
                tableHeaders.forEach((header, i) => {
                    doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
                    xPos += colWidths[i];
                });

                doc.moveTo(50, tableTop + 15).lineTo(540, tableTop + 15).stroke();

                // Datos
                let yPos = tableTop + 20;
                doc.font('Helvetica').fontSize(8);

                loans.forEach((loan) => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    xPos = 50;

                    // Type guard para userId y bookId
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
                        new Date(loan.loanDate).toLocaleDateString('es-CO'),
                        loan.status === 'active' ? 'Activo' : 'Devuelto',
                    ];

                    rowData.forEach((data, i) => {
                        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
                        xPos += colWidths[i];
                    });

                    yPos += 15;
                });

                // Footer
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    doc.fontSize(8).text(
                        `Página ${i + 1} de ${pages.count}`,
                        50,
                        doc.page.height - 50,
                        { align: 'center' }
                    );
                }

                doc.end();
            });
        } catch (error) {
            throw new InternalServerErrorException(`Error generating loans PDF: ${error.message}`);
        }
    }

    /**
     * Genera reporte de préstamos en formato XLSX
     */
    async generateLoansXLSX(dateFrom?: Date, dateTo?: Date): Promise<Buffer> {
        try {
            const workbook = new ExcelJS.Workbook();
            const loansSheet = workbook.addWorksheet('Préstamos');

            // Configurar columnas
            loansSheet.columns = [
                { header: 'Usuario', key: 'user', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Libro', key: 'book', width: 40 },
                { header: 'ISBN', key: 'isbn', width: 15 },
                { header: 'Fecha Préstamo', key: 'loanDate', width: 15 },
                { header: 'Fecha Devolución', key: 'returnDate', width: 15 },
                { header: 'Estado', key: 'status', width: 12 },
                { header: 'Días Préstamo', key: 'days', width: 15 },
            ];

            // Header
            const headerRow = loansSheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' },
            };

            // Obtener préstamos
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

            // Agregar datos
            loans.forEach((loan, index) => {
                const loanDate = new Date(loan.loanDate);
                const returnDate = loan.returnDate ? new Date(loan.returnDate) : null;

                // Type guards para userId y bookId
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
                    status: loan.status === 'active' ? 'Activo' : 'Devuelto',
                    days: returnDate
                        ? `=(F${index + 2}-E${index + 2})` // Fórmula para calcular días
                        : `=(TODAY()-E${index + 2})`, // Si aún está activo, días desde préstamo
                });

                // Formato de fechas
                row.getCell('loanDate').numFmt = 'dd/mm/yyyy';
                if (returnDate) {
                    row.getCell('returnDate').numFmt = 'dd/mm/yyyy';
                }
                row.getCell('days').numFmt = '#,##0';
            });

            // Hoja de estadísticas
            const statsSheet = workbook.addWorksheet('Estadísticas');

            statsSheet.columns = [
                { header: 'Métrica', key: 'metric', width: 30 },
                { header: 'Valor', key: 'value', width: 15 },
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

            statsSheet.addRow({ metric: 'Total de préstamos', value: loans.length });
            statsSheet.addRow({ metric: 'Préstamos activos', value: activeCount });
            statsSheet.addRow({ metric: 'Préstamos devueltos', value: returnedCount });
            statsSheet.addRow({ metric: 'Tasa de devolución (%)', value: `=B4/B2*100` }); // Fórmula
            statsSheet.getCell('B5').numFmt = '0.00"%"';
            statsSheet.addRow({ metric: 'Promedio días préstamo', value: `=AVERAGE(Préstamos!H:H)` }); // Link a otra hoja (verde)
            statsSheet.getCell('B6').numFmt = '#,##0';
            statsSheet.getCell('B6').font = { color: { argb: 'FF008000' } }; // Verde para links internos

            // Generar buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(buffer);
        } catch (error) {
            throw new InternalServerErrorException(`Error generating loans XLSX: ${error.message}`);
        }
    }
}