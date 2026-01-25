import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AddProductDto } from './dto/add-product.dto';
import { ChangeStockDto } from './dto/change-stock.dto';
import { generateISBN, estimatePageCount, assignDefaultAuthor, assignDefaultPublisher, generatePublicationYear } from './utils/migration.utils';

@Injectable()
export class ProductService {
    // Inventario Ordenado - Se mantiene siempre ordenado por ISBN (ascendente)
    private sortedInventory: Product[] = [];

    constructor(
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        private configService: ConfigService,
    ) {
        // Configure cloudinary
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLDN_NAME'),
            api_key: this.configService.get<string>('CLDN_API_KEY'),
            api_secret: this.configService.get<string>('CLDN_SECRET_KEY'),
        });

        this.initializeSortedInventory();
    }

    /**
     * Agrega los productos a la base de datos
     * @returns Producto con sus correspondientes datos
     */
    async addProduct(
        productData: AddProductDto,
        images: Express.Multer.File[],
    ): Promise<{ message: string }> {
        try {
            // Verify if product exists by ISBN
            if (productData.isbn) {
                const existingProduct = await this.productModel.findOne({
                    isbn: productData.isbn
                });

                if (existingProduct) {
                    throw new ConflictException(`Product with ISBN ${productData.isbn} already exists`);
                }
            }

            // Upload images to cloudinary
            const imagesUrl = await Promise.all(
                images.map(async (item) => {
                    const result = await cloudinary.uploader.upload(item.path, {
                        resource_type: 'image',
                    });
                    return result.secure_url;
                }),
            );

            // generate ISBN if there is none
            const isbn = productData.isbn || generateISBN();

            // Create new product
            const newProduct = await this.productModel.create({
                ...productData,
                images: imagesUrl,
                isbn,
                author: productData.author || assignDefaultAuthor(productData.category),
                popular: productData.popular ?? false,
                inStock: productData.inStock ?? true,
                pageCount: productData.pageCount || estimatePageCount(productData.category),
                publisher: productData.publisher || assignDefaultPublisher(productData.category),
                publicationYear: productData.publicationYear || generatePublicationYear(),
            });

            // Insertar en inventario ordenado usando Insertion Sort
            this.insertIntoSortedInventory(newProduct);

            return { message: 'Product added' };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Lista los productos que hay en el sistema (Inventario General)
     * @returns Lista de productos existentes
     */
    async listProducts(): Promise<Product[]> {
        try {
            const products = await this.productModel.find({});
            return products;
        } catch (error) {
            throw new InternalServerErrorException(error.message)
        }
    }

    /**
     * Lista UN SOLO producto existente (Inventario General)
     * @returns Identificador de un producto
     */
    async getSingleProduct(productId: string): Promise<Product> {
        try {
            const product = await this.productModel.findById(productId);

            if (!product) {
                throw new NotFoundException('Product not found');
            }
            return product;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Inicializa el inventario ordenado cargando productos con ISBN
     */
    private async initializeSortedInventory(): Promise<void> {
        try {
            const products = await this.productModel.find({
                isbn: { $exists: true, $ne: null, $nin: [''] }
            }).exec();

            this.sortedInventory = this.insertionSortByISBN(products);
            console.log(`[ProductService] Sorted inventory initialized with ${this.sortedInventory.length} products`);
        } catch (error) {
            console.error('[ProductService] Error initializing sorted inventory:', error);
        }
    }

    /**
     * INSERTION SORT - Ordena productos por ISBN (ascendente)
     * Complejidad: O(n²) peor caso, O(n) mejor caso
     * Se usa para mantener el Inventario Ordenado
     */
    private insertionSortByISBN(products: Product[]): Product[] {
        const arr = [...products];

        for (let i = 1; i < arr.length; i++) {
            const key = arr[i];
            const keyISBN = key.isbn || '';
            let j = i - 1;

            while (j >= 0 && (arr[j].isbn || '') > keyISBN) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }

        return arr;
    }

    /**
     * Inserta un producto en el inventario ordenado manteniendo el orden
     */
    private insertIntoSortedInventory(product: Product): void {
        if (!product.isbn) {
            console.warn('[ProductService] Product without ISBN cannot be added to sorted inventory');
            return;
        }

        // Encontrar posición correcta usando Insertion Sort
        let position = this.sortedInventory.length;

        for (let i = this.sortedInventory.length - 1; i >= 0; i--) {
            if ((this.sortedInventory[i].isbn || '') > product.isbn) {
                this.sortedInventory[i + 1] = this.sortedInventory[i];
                position = i;
            } else {
                break;
            }
        }

        this.sortedInventory[position] = product;
        console.log(`[ProductService] Product inserted at position ${position} in sorted inventory`);
    }

    /**
     * BÚSQUEDA LINEAL - Busca por título o autor en Inventario General (desordenado)
     * Complejidad: O(n)
     */
    private linearSearch(
        products: Product[],
        searchTerm: string,
        searchBy: 'title' | 'author'
    ): Product[] {
        const results: Product[] = [];
        const searchLower = searchTerm.toLowerCase();

        for (let i = 0; i < products.length; i++) {
            const product = products[i];

            if (searchBy === 'title') {
                if (product.name.toLowerCase().includes(searchLower)) {
                    results.push(product);
                }
            } else if (searchBy === 'author') {
                if (product.author?.toLowerCase().includes(searchLower)) {
                    results.push(product);
                }
            }
        }

        return results;
    }

    /**
     * BÚSQUEDA BINARIA - Busca por ISBN en Inventario Ordenado
     * Complejidad: O(log n)
     * CRÍTICO: Se usa para verificar reservas pendientes al devolver libros
     */
    private binarySearchByISBN(isbn: string): { found: boolean; index: number; product?: Product } {
        if (!isbn || this.sortedInventory.length === 0) {
            return { found: false, index: -1 };
        }

        let start = 0;
        let end = this.sortedInventory.length - 1;

        while (start <= end) {
            const middle = Math.floor((start + end) / 2);
            const middleISBN = this.sortedInventory[middle].isbn || '';

            if (middleISBN === isbn) {
                return {
                    found: true,
                    index: middle,
                    product: this.sortedInventory[middle]
                };
            }

            if (isbn < middleISBN) {
                end = middle - 1;
            } else {
                start = middle + 1;
            }
        }

        return { found: false, index: -1 };
    }

    /**
     * MERGE SORT - Ordena productos por valor (precio de oferta)
     * Complejidad: O(n log n)
     * Se usa para generar Reporte Global de inventario por valor
     */
    private mergeSortByValue(products: Product[], ascending: boolean = true): Product[] {
        if (products.length <= 1) {
            return [...products];
        }

        const middle = Math.floor(products.length / 2);
        const left = products.slice(0, middle);
        const right = products.slice(middle);

        return this.merge(
            this.mergeSortByValue(left, ascending),
            this.mergeSortByValue(right, ascending),
            ascending
        );
    }

    /**
     * Función auxiliar para Merge Sort
     */
    private merge(left: Product[], right: Product[], ascending: boolean): Product[] {
        const result: Product[] = [];
        let leftIndex = 0;
        let rightIndex = 0;

        while (leftIndex < left.length && rightIndex < right.length) {
            const leftValue = left[leftIndex].offerPrice;
            const rightValue = right[rightIndex].offerPrice;

            const shouldTakeLeft = ascending
                ? leftValue <= rightValue
                : leftValue >= rightValue;

            if (shouldTakeLeft) {
                result.push(left[leftIndex]);
                leftIndex++;
            } else {
                result.push(right[rightIndex]);
                rightIndex++;
            }
        }

        while (leftIndex < left.length) {
            result.push(left[leftIndex]);
            leftIndex++;
        }

        while (rightIndex < right.length) {
            result.push(right[rightIndex]);
            rightIndex++;
        }

        return result;
    }

    /**
     * Obtiene Inventario Ordenado por ISBN
     */
    getSortedInventory(): Product[] {
        return [...this.sortedInventory];
    }

    /**
     * Búsqueda lineal por título o autor
     */
    async searchByTitleOrAuthor(
        searchTerm: string,
        searchBy: 'title' | 'author' = 'title'
    ): Promise<Product[]> {
        try {
            const products = await this.listProducts();
            const results = this.linearSearch(products, searchTerm, searchBy);

            console.log(`[ProductService] Linear search "${searchTerm}" by ${searchBy}: ${results.length} results`);
            return results;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Búsqueda binaria por ISBN (CRÍTICO)
     * Usado por LoanService para verificar reservas pendientes
     */
    searchByISBN(isbn: string): { found: boolean; product?: Product } {
        const result = this.binarySearchByISBN(isbn);
        console.log(`[ProductService] Binary search ISBN ${isbn}: ${result.found ? 'FOUND' : 'NOT FOUND'}`);

        return {
            found: result.found,
            product: result.product
        };
    }

    /**
     * Cambia el estado de stock de un producto
     * @returns Booleano. True si está en stock, false si no
     */
    async changeStock(
        changeStockDto: ChangeStockDto,
    ): Promise<{ message: string }> {
        try {
            const { productId, inStock } = changeStockDto;

            const product = await this.productModel.findByIdAndUpdate(
                productId,
                { inStock },
                { new: true },
            );

            if (!product) {
                throw new NotFoundException('Product not found');
            }

            return { message: 'Stock Updated' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Genera Reporte Global ordenado por valor usando Merge Sort
     */
    async generateValueReport(ascending: boolean = true): Promise<Product[]> {
        try {
            const products = await this.listProducts();
            const sortedProducts = this.mergeSortByValue(products, ascending);

            console.log(`[ProductService] Value report: ${sortedProducts.length} products (${ascending ? 'ASC' : 'DESC'})`);
            return sortedProducts;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Migra productos existentes sin ISBN/autor/páginas
     * @returns Cantidad de productos migrados
     */
    async migrateLegacyProducts(): Promise<{
        message: string;
        migrated: number;
        skipped: number;
        errors: string[];
    }> {
        try {
            // Buscar productos sin ISBN
            const productsWithoutISBN = await this.productModel.find({
                $or: [
                    { isbn: { $exists: false } },
                    { isbn: null },
                    { isbn: '' }
                ]
            });

            let migratedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];
            const usedISBNs = new Set<string>();

            console.log(`[Migration] Found ${productsWithoutISBN.length} products to migrate`);

            for (const product of productsWithoutISBN) {
                try {
                    // Generar ISBN único
                    let isbn = generateISBN();
                    let attempts = 0;

                    // Reintentar si hay colisión
                    while (usedISBNs.has(isbn) || await this.productModel.findOne({ isbn })) {
                        isbn = generateISBN();
                        attempts++;

                        if (attempts > 10) {
                            throw new Error('Failed to generate unique ISBN after 10 attempts');
                        }
                    }

                    usedISBNs.add(isbn);

                    // Generar datos aleatorios pero coherentes con la categoría
                    const author = assignDefaultAuthor(product.category);
                    const pageCount = estimatePageCount(product.category);
                    const publisher = assignDefaultPublisher(product.category);
                    const publicationYear = generatePublicationYear(product.category);

                    // Actualizar producto
                    await this.productModel.findByIdAndUpdate(
                        product._id,
                        {
                            isbn,
                            author,
                            pageCount,
                            publisher,
                            publicationYear,
                        },
                        { new: true }
                    );

                    migratedCount++;
                    console.log(`[Migration] ✓ ${migratedCount}/${productsWithoutISBN.length} - ${product.name}`);
                    console.log(`  ISBN: ${isbn} | Author: ${author} | Pages: ${pageCount} | Publisher: ${publisher} | Year: ${publicationYear}`);

                } catch (error) {
                    const errorMsg = `Failed to migrate ${product.name}: ${error.message}`;
                    errors.push(errorMsg);
                    console.error(`[Migration] ✗ ${errorMsg}`);
                    skippedCount++;
                }
            }

            const message = `Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`;
            console.log(`[Migration] ${message}`);

            return {
                message,
                migrated: migratedCount,
                skipped: skippedCount,
                errors,
            };

        } catch (error) {
            throw new InternalServerErrorException(
                `Migration failed: ${error.message}`
            );
        }
    }

    /**
     * Verifica el estado de la migración
     */
    async getMigrationStatus(): Promise<{
        total: number;
        migrated: number;
        pending: number;
        percentage: number;
    }> {
        try {
            const total = await this.productModel.countDocuments();
            const migrated = await this.productModel.countDocuments({
                isbn: { $exists: true, $nin: [null, ''] }
            });
            const pending = total - migrated;
            const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0;

            return {
                total,
                migrated,
                pending,
                percentage,
            };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
