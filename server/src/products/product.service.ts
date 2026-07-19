import { ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AddProductDto } from './dto/add-product.dto';
import { ChangeStockDto } from './dto/change-stock.dto';
import { generateISBN, estimatePageCount, assignDefaultAuthor, assignDefaultPublisher, generatePublicationYear } from './utils/migration.utils';
import { PaginatedResult, PaginationDto } from 'src/common/dto/pagination.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TranslationService } from 'src/common/services/translation.service';

@Injectable()
export class ProductService {
    constructor(
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        private configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private translationService: TranslationService,
    ) {
        // Configure cloudinary
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLDN_NAME'),
            api_key: this.configService.get<string>('CLDN_API_KEY'),
            api_secret: this.configService.get<string>('CLDN_SECRET_KEY'),
        });
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
            if (productData.isbn) {
                const existingProduct = await this.productModel.findOne({
                    isbn: productData.isbn,
                });
                if (existingProduct) {
                    throw new ConflictException(
                        `Product with ISBN ${productData.isbn} already exists`,
                    );
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

            // Auto-translate if requested (fire-and-forget, don't block response)
            if (productData.autoTranslate !== false) {
                const targetLang = 'es'; // Default: translate to Spanish
                this.translateProductAuto(newProduct._id.toString(), targetLang).catch((err) => {
                    console.error(`[ProductService] Auto-translate failed for ${newProduct._id}:`, err.message);
                });
            }

            return { message: 'Product added' };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Lista los productos que hay en el sistema (Inventario General)
     * @returns Lista de productos existentes
     */
    async listProducts(pagination: PaginationDto = {}): Promise<PaginatedResult<Product>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const cacheKey = `products:list:${page}:${limit}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<PaginatedResult<Product>>(cacheKey);
            if (cached) {
                return cached;
            }

            const skip = (page - 1) * limit;

            const [data, total] = await Promise.all([
                this.productModel.find().skip(skip).limit(limit).lean(),
                this.productModel.countDocuments(),
            ]);

            const result: PaginatedResult<Product> = {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };

            // Guardar en caché por 2 minutos
            await this.cacheManager.set(cacheKey, result, 120);

            return result;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Lista UN SOLO producto existente (Inventario General)
     * @returns Identificador de un producto
     */
    async getSingleProduct(productId: string): Promise<Product> {
        try {
            const cacheKey = `product:${productId}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<Product>(cacheKey);
            if (cached) {
                return cached;
            }

            const product = await this.productModel.findById(productId);
            if (!product) throw new NotFoundException('Product not found');

            // Guardar en caché por 5 minutos (producto individual)
            await this.cacheManager.set(cacheKey, product.toObject(), 300);

            return product;
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene inventario ordenado por ISBN directamente desde MongoDB.
     * Reemplaza el array en memoria — siempre refleja el estado actual de la BD.
     */
    async getSortedInventory(): Promise<Product[]> {
        try {
            return await this.productModel
                .find({ isbn: { $exists: true, $nin: [null, ''] } })
                .sort({ isbn: 1 })
                .lean()
                .exec();
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Búsqueda lineal por nombre o autor directamente en MongoDB.
     * Usa $regex case-insensitive — semánticamente equivalente al loop anterior,
     * sin necesidad de cargar todos los productos en memoria.
     */
    async searchByTitleOrAuthor(
        searchTerm: string,
        searchBy: 'title' | 'author' = 'title',
    ): Promise<Product[]> {
        try {
            // El campo en el schema es 'name', no 'title'
            const field = searchBy === 'title' ? 'name' : 'author';
            const results = await this.productModel
                .find({ [field]: { $regex: searchTerm, $options: 'i' } })
                .lean()
                .exec();
            console.log(`[ProductService] Linear search "${searchTerm}" by ${searchBy} (field: ${field}): ${results.length} results`);
            return results;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Búsqueda por ISBN directamente en MongoDB usando el índice único sparse.
     * equivalente a la búsqueda binaria anterior pero
     * sin depender de estado en memoria.
     */
    async searchByISBN(isbn: string): Promise<{ found: boolean; product?: Product }> {
        try {
            const cacheKey = `product:isbn:${isbn}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<{ found: boolean; product?: Product }>(cacheKey);
            if (cached) {
                return cached;
            }

            const product = await this.productModel.findOne({ isbn }).lean().exec();
            const found = product !== null;
            const result = { found, product: product ?? undefined };

            // Guardar en caché por 10 minutos (ISBN es estable)
            await this.cacheManager.set(cacheKey, result, 600);

            console.log(`[ProductService] ISBN search ${isbn}: ${found ? 'FOUND' : 'NOT FOUND'}`);
            return result;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Búsqueda unified: detecta ISBN vs texto y delega al método apropiado.
     * El cliente no necesita saber qué algoritmo se usa internamente.
     */
    async search(query: string, pagination: PaginationDto = {}): Promise<PaginatedResult<Product>> {
        const { page = 1, limit = 20 } = pagination;
        const cleanQuery = query.replace(/-/g, '');
        const isIsbn = /^\d{9}[\dX]$/.test(cleanQuery) || /^\d{13}$/.test(cleanQuery);

        if (isIsbn) {
            const result = await this.searchByISBN(cleanQuery);
            const total = result.product ? 1 : 0;
            const data = result.product && page === 1 ? [result.product] : [];
            return {
                data,
                pagination: { page, limit, total, totalPages: total },
            };
        }

        const cacheKey = `products:search:${query}:${page}:${limit}`;

        // Intentar obtener del caché
        const cached = await this.cacheManager.get<PaginatedResult<Product>>(cacheKey);
        if (cached) {
            return cached;
        }

        const skip = (page - 1) * limit;

        const filter = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { author: { $regex: query, $options: 'i' } }
            ]
        };

        const [data, total] = await Promise.all([
            this.productModel.find(filter).skip(skip).limit(limit).lean().exec(),
            this.productModel.countDocuments(filter),
        ]);

        const result: PaginatedResult<Product> = {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        // Guardar en caché por 2 minutos
        await this.cacheManager.set(cacheKey, result, 120);

        return result;
    }

    /**
     * Cambia el estado de stock de un producto
     * @returns Booleano. True si está en stock, false si no
     */
    async changeStock(changeStockDto: ChangeStockDto): Promise<{ message: string }> {
        try {
            const { productId, inStock } = changeStockDto;
            const product = await this.productModel.findByIdAndUpdate(
                productId,
                { inStock },
                { new: true },
            );
            if (!product) throw new NotFoundException('Product not found');

            // Invalidar caché del producto específico
            await this.cacheManager.del(`product:${productId}`);

            return { message: 'Stock Updated' };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    // Genera Reporte Global ordenado por valor usando Merge Sort
    async generateValueReport(ascending: boolean = true): Promise<Product[]> {
        try {
            const products = await this.productModel.find({}).lean();
            const sortedProducts = this.mergeSortByValue(products, ascending);
            console.log(`[ProductService] Value report: ${sortedProducts.length} products (${ascending ? 'ASC' : 'DESC'})`);
            return sortedProducts;
        } catch (error: any) {
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
            const productsWithoutISBN = await this.productModel.find({
                $or: [
                    { isbn: { $exists: false } },
                    { isbn: null },
                    { isbn: '' },
                ],
            });

            let migratedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];
            const usedISBNs = new Set<string>();

            console.log(`[Migration] Found ${productsWithoutISBN.length} products to migrate`);

            for (const product of productsWithoutISBN) {
                try {
                    let isbn = generateISBN();
                    let attempts = 0;

                    while (
                        usedISBNs.has(isbn) ||
                        (await this.productModel.findOne({ isbn }))
                    ) {
                        isbn = generateISBN();
                        attempts++;
                        if (attempts > 10) {
                            throw new Error('Failed to generate unique ISBN after 10 attempts');
                        }
                    }

                    usedISBNs.add(isbn);

                    const author = assignDefaultAuthor(product.category);
                    const pageCount = estimatePageCount(product.category);
                    const publisher = assignDefaultPublisher(product.category);
                    const publicationYear = generatePublicationYear(product.category);

                    await this.productModel.findByIdAndUpdate(
                        product._id,
                        { isbn, author, pageCount, publisher, publicationYear },
                        { new: true },
                    );

                    migratedCount++;
                    console.log(`[Migration] ✓ ${migratedCount}/${productsWithoutISBN.length} - ${product.name}`);
                } catch (error: any) {
                    const errorMsg = `Failed to migrate ${product.name}: ${error.message}`;
                    errors.push(errorMsg);
                    console.error(`[Migration] ✗ ${errorMsg}`);
                    skippedCount++;
                }
            }

            const message = `Migration completed: ${migratedCount} migrated, ${skippedCount} skipped`;
            console.log(`[Migration] ${message}`);

            return { message, migrated: migratedCount, skipped: skippedCount, errors };
        } catch (error: any) {
            throw new InternalServerErrorException(`Migration failed: ${error.message}`);
        }
    }

    // Verifica el estado de la migración
    async getMigrationStatus(): Promise<{
        total: number;
        migrated: number;
        pending: number;
        percentage: number;
    }> {
        try {
            const total = await this.productModel.countDocuments();
            const migrated = await this.productModel.countDocuments({
                isbn: { $exists: true, $nin: [null, ''] },
            });
            const pending = total - migrated;
            const percentage =
                total > 0 ? Math.round((migrated / total) * 100) : 0;

            return { total, migrated, pending, percentage };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * RECURSIÓN DE PILA: Calcula el valor total de todos los libros de una categoría específica
     * Demuestra recursión tradicional usando la pila de llamadas
     * Complejidad: O(n) donde n es el número de libros en la categoría
     */
    async calculateTotalValueByCategory(category: string): Promise<{
        category: string;
        totalValue: number;
        bookCount: number;
        executionLog: string[];
    }> {
        try {
            const books = await this.productModel.find({ category }).exec();
            const log: string[] = [];

            console.log(`[ProductService] Starting stack recursion for category: ${category}`);
            log.push(`Iniciando recursión de pila para categoría: ${category}`);
            log.push(`Total de libros encontrados: ${books.length}`);

            const calculateRecursive = (
                bookList: Product[],
                index: number,
                depth: number,
            ): number => {
                if (index >= bookList.length) {
                    const message = `${'  '.repeat(depth)}[Caso base] Fin de la lista alcanzado en índice ${index}`;
                    console.log(message);
                    log.push(message);
                    return 0;
                }

                const currentBook = bookList[index];
                const message = `${'  '.repeat(depth)}[Nivel ${depth}] Procesando libro ${index + 1}/${bookList.length}: "${currentBook.name}" - Valor: $${currentBook.offerPrice}`;
                console.log(message);
                log.push(message);

                const remainingValue = calculateRecursive(bookList, index + 1, depth + 1);
                const totalValue = currentBook.offerPrice + remainingValue;
                const returnMessage = `${'  '.repeat(depth)}[Retorno nivel ${depth}] Valor acumulado: $${totalValue}`;
                console.log(returnMessage);
                log.push(returnMessage);

                return totalValue;
            };

            const totalValue = calculateRecursive(books, 0, 0);

            log.push(`\nRESULTADO FINAL`);
            log.push(`Categoría: ${category}`);
            log.push(`Total de libros: ${books.length}`);
            log.push(`Valor total: $${totalValue} COP`);
            log.push(`Promedio por libro: $${books.length > 0 ? (totalValue / books.length).toFixed(2) : 0} COP`);

            console.log(`[ProductService] Stack recursion completed: ${totalValue} COP for ${books.length} books`);
            return { category, totalValue, bookCount: books.length, executionLog: log };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * RECURSIÓN DE COLA: Calcula el peso promedio de los libros de una categoría
     * Demuestra tail recursion optimization donde el resultado se acumula en parámetros
     */
    async calculateAverageWeightByCategory(category: string): Promise<{
        category: string;
        averageWeight: number;
        totalWeight: number;
        bookCount: number;
        executionLog: string[];
    }> {
        try {
            const books = await this.productModel
                .find({ category, pageCount: { $exists: true, $ne: null } })
                .exec();

            const log: string[] = [];

            console.log(`[ProductService] Starting tail recursion for category: ${category}`);
            log.push(`Iniciando recursión de cola para categoría: ${category}`);
            log.push(`Total de libros encontrados: ${books.length}`);

            const calculateTailRecursive = (
                bookList: Product[],
                index: number,
                accumulatedWeight: number,
                depth: number,
            ): number => {
                if (index >= bookList.length) {
                    const message = `${'→ '.repeat(depth)}[Caso base] Índice ${index} alcanzado. Peso total acumulado: ${accumulatedWeight.toFixed(3)} Kg`;
                    console.log(message);
                    log.push(message);
                    return accumulatedWeight;
                }

                const currentBook = bookList[index];
                const bookWeight = (currentBook.pageCount || 0) * 0.005;
                const newAccumulated = accumulatedWeight + bookWeight;

                const message = `${'→ '.repeat(depth)}[Iteración ${index + 1}/${bookList.length}] "${currentBook.name}" (${currentBook.pageCount} páginas) = ${bookWeight.toFixed(3)} Kg | Acumulado: ${newAccumulated.toFixed(3)} Kg`;
                console.log(message);
                log.push(message);

                return calculateTailRecursive(bookList, index + 1, newAccumulated, depth + 1);
            };

            const totalWeight = calculateTailRecursive(books, 0, 0, 0);
            const averageWeight = books.length > 0 ? totalWeight / books.length : 0;

            log.push(`\nRESULTADO FINAL`);
            log.push(`Categoría: ${category}`);
            log.push(`Total de libros: ${books.length}`);
            log.push(`Peso total: ${totalWeight.toFixed(3)} Kg`);
            log.push(`Peso promedio: ${averageWeight.toFixed(3)} Kg`);

            console.log(`[ProductService] Tail recursion completed: ${averageWeight.toFixed(3)} Kg average for ${books.length} books`);

            return {
                category,
                averageWeight: parseFloat(averageWeight.toFixed(3)),
                totalWeight: parseFloat(totalWeight.toFixed(3)),
                bookCount: books.length,
                executionLog: log,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Ordena productos por precio usando Merge Sort.
     * Delegado a mergeSortByValue que cubre el mismo caso.
     */
    async sortProductsByPrice(ascending: boolean = true): Promise<Product[]> {
        return this.generateValueReport(ascending);
    }

    /**
     * Obtiene productos con traducciones aplicadas según el idioma solicitado
     * @param lang - Código de idioma (es, en, etc.)
     */
    async listProductsWithTranslation(lang: string = 'en', pagination: PaginationDto = {}): Promise<PaginatedResult<Product>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const cacheKey = `products:list:${lang}:${page}:${limit}`;

            // Attempt cache hit
            const cached = await this.cacheManager.get<PaginatedResult<Product>>(cacheKey);
            if (cached) {
                return cached;
            }

            const skip = (page - 1) * limit;

            const [rawProducts, total] = await Promise.all([
                this.productModel.find().skip(skip).limit(limit),
                this.productModel.countDocuments(),
            ]);

            const data = lang === 'en'
                ? rawProducts
                : rawProducts.map((product) => this.applyTranslation(product, lang));

            const result: PaginatedResult<Product> = {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };

            // Cache for 2 minutes
            await this.cacheManager.set(cacheKey, result, 120);

            return result;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene un producto con traducción aplicada
     * @param productId - ID del producto
     * @param lang - Código de idioma
     */
    async getProductWithTranslation(
        productId: string,
        lang: string = 'en',
    ): Promise<Product> {
        try {
            const product = await this.productModel.findById(productId);
            if (!product) throw new NotFoundException('Product not found');
            if (lang === 'en') return product;
            return this.applyTranslation(product, lang);
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Guarda o actualiza la traducción de un producto
     * @param productId - ID del producto
     * @param lang - Código de idioma
     * @param translation - Objeto con las traducciones
     */
    async updateProductTranslation(
        productId: string,
        lang: string,
        translation: { name?: string; description?: string; category?: string },
    ): Promise<{ message: string; product: Product }> {
        try {
            const product = await this.productModel.findById(productId);
            if (!product) throw new NotFoundException('Product not found');

            const translations = product.translations || {};
            translations[lang] = { ...translations[lang], ...translation };

            const updatedProduct = await this.productModel.findByIdAndUpdate(
                productId,
                { translations },
                { new: true },
            );

            if (!updatedProduct) throw new NotFoundException('Product not found after update');

            // Invalidar caché del producto y de listados
            await this.cacheManager.del(`product:${productId}`);
            // Invalidate all product list caches (pattern-based)
            await this.invalidateProductListCache();

            return {
                message: `Translation for ${lang} updated successfully`,
                product: updatedProduct,
            };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Actualiza traducciones de múltiples productos a la vez (bulk)
     * @param lang - Código de idioma
     * @param translations - Array de { productId, name, description, category }
     */
    async bulkUpdateTranslations(
        lang: string,
        translations: Array<{
            productId: string;
            name?: string;
            description?: string;
            category?: string;
        }>,
    ): Promise<{ message: string; updatedCount: number }> {
        try {
            let updatedCount = 0;

            for (const translation of translations) {
                const product = await this.productModel.findById(translation.productId);
                if (product) {
                    const productTranslations = product.translations || {};
                    productTranslations[lang] = {
                        name: translation.name,
                        description: translation.description,
                        category: translation.category,
                    };
                    await this.productModel.findByIdAndUpdate(translation.productId, {
                        translations: productTranslations,
                    });

                    // Invalidar caché de cada producto actualizado
                    await this.cacheManager.del(`product:${translation.productId}`);

                    updatedCount++;
                }
            }

            return {
                message: `Translations updated for ${updatedCount} products`,
                updatedCount,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    // Obtiene las traducciones disponibles para un producto
    async getProductTranslations(
        productId: string,
    ): Promise<{ translations: Record<string, any> }> {
        try {
            const product = await this.productModel.findById(productId);
            if (!product) throw new NotFoundException('Product not found');
            return { translations: product.translations || {} };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    // Ordena productos por valor (precio de oferta)
    // Se usa para generar Reporte Global de inventario por valor
    private mergeSortByValue(
        products: Product[],
        ascending: boolean = true,
    ): Product[] {
        if (products.length <= 1) return [...products];

        const middle = Math.floor(products.length / 2);
        const left = products.slice(0, middle);
        const right = products.slice(middle);

        return this.merge(
            this.mergeSortByValue(left, ascending),
            this.mergeSortByValue(right, ascending),
            ascending,
        );
    }

    // Función auxiliar para Merge Sort
    private merge(
        left: Product[],
        right: Product[],
        ascending: boolean,
    ): Product[] {
        const result: Product[] = [];
        let l = 0;
        let r = 0;

        while (l < left.length && r < right.length) {
            const takeLeft = ascending
                ? left[l].offerPrice <= right[r].offerPrice
                : left[l].offerPrice >= right[r].offerPrice;

            if (takeLeft) {
                result.push(left[l++]);
            } else {
                result.push(right[r++]);
            }
        }

        return result.concat(left.slice(l)).concat(right.slice(r));
    }

    // Aplica la traducción a un producto
    private applyTranslation(product: ProductDocument, lang: string): Product {
        const productObj = product.toObject();
        const translation = productObj.translations?.[lang];

        if (translation) {
            return {
                ...productObj,
                name: translation.name || productObj.name,
                description: translation.description || productObj.description,
                category: translation.category || productObj.category,
            };
        }

        return productObj;
    }

    // Busca por título o autor en Inventario General (desordenado)
    private linearSearch(
        products: Product[],
        searchTerm: string,
        searchBy: 'title' | 'author',
    ): Product[] {
        const results: Product[] = [];
        const searchLower = searchTerm.toLowerCase();

        for (const product of products) {
            const target =
                searchBy === 'title' ? product.name : (product.author ?? '');
            if (target.toLowerCase().includes(searchLower)) {
                results.push(product);
            }
        }

        return results;
    }

    // Implementación de Merge Sort para ordenar por precio (offerPrice)
    private mergeSortByPrice(arr: Product[], ascending: boolean): Product[] {
        if (arr.length <= 1) return arr;

        const mid = Math.floor(arr.length / 2);
        return this.mergeByPrice(
            this.mergeSortByPrice(arr.slice(0, mid), ascending),
            this.mergeSortByPrice(arr.slice(mid), ascending),
            ascending,
        );
    }

    // Función auxiliar para combinar dos arrays ordenados
    private mergeByPrice(
        left: Product[],
        right: Product[],
        ascending: boolean,
    ): Product[] {
        const result: Product[] = [];
        let l = 0;
        let r = 0;

        while (l < left.length && r < right.length) {
            const comparison = ascending
                ? left[l].offerPrice <= right[r].offerPrice
                : left[l].offerPrice >= right[r].offerPrice;

            if (comparison) {
                result.push(left[l++]);
            } else {
                result.push(right[r++]);
            }
        }

        return result.concat(left.slice(l)).concat(right.slice(r));
    }

    /**
     * Traduce un producto automáticamente al idioma destino usando el TranslationService
     */
    async translateProductAuto(
        productId: string,
        toLanguage: string,
    ): Promise<{ message: string; translation: { name: string; description: string; category: string } }> {
        try {
            const product = await this.productModel.findById(productId);
            if (!product) throw new NotFoundException('Product not found');

            // Base product fields are stored in English; only translating away from the base is meaningful.
            const fromLanguage = 'en';
            if (toLanguage === fromLanguage) {
                throw new InternalServerErrorException(
                    `Cannot translate to base language "${toLanguage}"`,
                );
            }

            const translatedFields = await this.translationService.translateProduct(
                { name: product.name, description: product.description, category: product.category },
                fromLanguage,
                toLanguage,
            );

            const safeTranslatedFields = {
                name: translatedFields.name ?? product.name,
                description: translatedFields.description ?? product.description,
                category: translatedFields.category ?? product.category,
            };

            // Merge with existing translations
            const translations = product.translations || {};
            translations[toLanguage] = {
                name: safeTranslatedFields.name,
                description: safeTranslatedFields.description,
                category: safeTranslatedFields.category,
                translatedAt: new Date(),
                translatedBy: 'automatic',
            };

            await this.productModel.findByIdAndUpdate(
                productId,
                { translations },
                { new: true },
            );

            // Invalidate cache
            await this.cacheManager.del(`product:${productId}`);
            await this.invalidateProductListCache();

            return {
                message: `Product translated to ${toLanguage} successfully`,
                translation: safeTranslatedFields,
            };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(`Translation failed: ${error.message}`);
        }
    }

    /**
     * Traduce múltiples productos en lote al idioma destino
     */
    async batchTranslateAuto(
        productIds: string[],
        toLanguage: string,
    ): Promise<{ message: string; translated: number; failed: number; errors: string[] }> {
        let translated = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const productId of productIds) {
            try {
                await this.translateProductAuto(productId, toLanguage);
                translated++;
            } catch (error: any) {
                failed++;
                errors.push(`${productId}: ${error.message}`);
            }
        }

        return {
            message: `Batch translation completed: ${translated} translated, ${failed} failed`,
            translated,
            failed,
            errors,
        };
    }

    /**
     * Obtiene estadísticas de cobertura de traducciones
     */
    async getTranslationStats(): Promise<{
        total: number;
        translatedEs: number;
        translatedEn: number;
        pendingEs: number;
        pendingEn: number;
    }> {
        try {
            const total = await this.productModel.countDocuments();

            const translatedEs = await this.productModel.countDocuments({
                'translations.es': { $exists: true, $ne: null },
            });

            const translatedEn = await this.productModel.countDocuments({
                'translations.en': { $exists: true, $ne: null },
            });

            return {
                total,
                translatedEs,
                translatedEn,
                pendingEs: total - translatedEs,
                pendingEn: total - translatedEn,
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Invalida todas las cachés de listado de productos
     */
    private async invalidateProductListCache(): Promise<void> {
        // Since cache-manager doesn't support pattern deletion out of the box,
        // we delete known keys. For a production system, consider using Redis keys().
        const langs = ['en', 'es'];
        for (const lang of langs) {
            for (let page = 1; page <= 10; page++) {
                for (const limit of [20, 50, 100]) {
                    await this.cacheManager.del(`products:list:${lang}:${page}:${limit}`);
                }
            }
        }
        // Also invalidate the default (no lang) list cache
        for (let page = 1; page <= 10; page++) {
            for (const limit of [20, 50, 100]) {
                await this.cacheManager.del(`products:list:${page}:${limit}`);
            }
        }
    }

    /**
     * Traduce TODOS los productos al idioma destino
     */
    async translateAllProducts(toLanguage: string): Promise<{ message: string; translated: number; failed: number; errors: string[] }> {
        const allProducts = await this.productModel.find().lean();
        const productIds = allProducts.map(p => p._id.toString());
        return this.batchTranslateAuto(productIds, toLanguage);
    }
}