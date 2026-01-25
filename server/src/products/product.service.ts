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
            await this.productModel.create({
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

            return { message: 'Product added' };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Lista los productos que hay en el sistema
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
     * Lista UN SOLO producto existente
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
