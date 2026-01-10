import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AddProductDto } from './dto/add-product.dto';
import { ChangeStockDto } from './dto/change-stock.dto';

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

    async addProduct(
        productData: AddProductDto,
        images: Express.Multer.File[],
    ): Promise<{ message: string }> {
        try {
            // Upload images to cloudinary
            const imagesUrl = await Promise.all(
                images.map(async (item) => {
                    const result = await cloudinary.uploader.upload(item.path, {
                        resource_type: 'image',
                    });
                    return result.secure_url;
                }),
            );

            // Create a new product
            await this.productModel.create({
                ...productData,
                images: imagesUrl,
            });

            return { message: 'Product added' };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async listProducts(): Promise<Product[]> {
        try {
            const products = await this.productModel.find({});
            return products;
        } catch (error) {
            throw new InternalServerErrorException(error.message)
        }
    }

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
}
