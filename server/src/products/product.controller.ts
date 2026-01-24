import { Body, Controller, Get, HttpStatus, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { AddProductDto } from './dto/add-product.dto';
import { SingleProductDto } from './dto/single-product.dto';
import { ChangeStockDto } from './dto/change-stock.dto';

@ApiTags('Product')
@Controller('product')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Post('add')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @UseInterceptors(
        FilesInterceptor('images', 10, {
            storage: diskStorage({}),
        }),
    )
    @ApiOperation({ summary: 'Add a new product (Admin only)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                isbn: { type: 'string', example: '978-0-306-40615-7' },
                name: { type: 'string', example: 'Product Name' },
                description: { type: 'string', example: 'Product description' },
                author: { type: 'string', example: 'J.K. Rowling' },
                price: { type: 'number', example: 100 },
                offerPrice: { type: 'number', example: 80 },
                pageCount: { type: 'number', example: 350 },
                publisher: { type: 'string', example: 'Penguin Books' },
                publicationYear: { type: 'number', example: 2023 },
                category: { type: 'string', example: 'Electronics' },
                popular: { type: 'boolean', example: false },
                inStock: { type: 'boolean', example: true },
                images: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Product added successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'ISBN already exists' })
    async addProduct(
        @Body() addProductDto: AddProductDto,
        @UploadedFiles() images: Express.Multer.File[],
        @Res() res: Response,
    ) {
        try {
            const result = await this.productService.addProduct(
                addProductDto,
                images,
            );

            return res.status(HttpStatus.CREATED).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Get('list')
    @ApiOperation({ summary: 'Get all products' })
    @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
    async listProducts(@Res() res: Response) {
        try {
            const products = await this.productService.listProducts();

            return res.status(HttpStatus.OK).json({
                success: true,
                products,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Post('single')
    @ApiOperation({ summary: 'Get a single product by ID' })
    @ApiBody({ type: SingleProductDto })
    @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async singleProduct(
        @Body() singleProductDto: SingleProductDto,
        @Res() res: Response,
    ) {
        try {
            const product = await this.productService.getSingleProduct(
                singleProductDto.productId,
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                product,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Post('stock')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Change product stock status (Admin only)' })
    @ApiBody({ type: ChangeStockDto })
    @ApiResponse({ status: 200, description: 'Stock updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async changeStock(
        @Body() changeStockDto: ChangeStockDto,
        @Res() res: Response,
    ) {
        try {
            const result = await this.productService.changeStock(changeStockDto);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Post('migrate')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Migrate legacy products (Admin only)',
        description: 'Adds ISBN, author, pageCount, etc. to existing products that lack these fields'
    })
    @ApiResponse({
        status: 200,
        description: 'Migration completed',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Migration completed: 42 migrated, 0 skipped' },
                migrated: { type: 'number', example: 42 },
                skipped: { type: 'number', example: 0 },
                errors: { type: 'array', items: { type: 'string' }, example: [] }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async migrateLegacyProducts(@Res() res: Response) {
        try {
            const result = await this.productService.migrateLegacyProducts();

            return res.status(HttpStatus.OK).json({
                success: true,
                ...result,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Get('migration-status')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Check migration status (Admin only)',
        description: 'Returns how many products have been migrated vs pending'
    })
    @ApiResponse({
        status: 200,
        description: 'Migration status retrieved',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                status: {
                    type: 'object',
                    properties: {
                        total: { type: 'number', example: 42 },
                        migrated: { type: 'number', example: 42 },
                        pending: { type: 'number', example: 0 },
                        percentage: { type: 'number', example: 100 }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMigrationStatus(@Res() res: Response) {
        try {
            const status = await this.productService.getMigrationStatus();

            return res.status(HttpStatus.OK).json({
                success: true,
                status,
            });
        } catch (error) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }
}
