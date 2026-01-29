import { BadRequestException, Body, Controller, Get, HttpStatus, Param, Post, Query, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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

    /**
    * Obtiene el Inventario Ordenado por ISBN
    */
    @Get('sorted-inventory')
    @ApiOperation({
        summary: 'Get sorted inventory by ISBN',
        description: 'Returns the sorted inventory maintained for binary search operations'
    })
    @ApiResponse({
        status: 200,
        description: 'Sorted inventory retrieved successfully'
    })
    async getSortedInventory(@Res() res: Response) {
        try {
            const products = this.productService.getSortedInventory();

            return res.status(HttpStatus.OK).json({
                success: true,
                count: products.length,
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

    /**
     * Búsqueda Lineal por título o autor
     */
    @Post('search/linear')
    @ApiOperation({
        summary: 'Linear search by title or author',
        description: 'Searches in the unsorted general inventory using linear search algorithm (O(n))'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                searchTerm: {
                    type: 'string',
                    example: 'Harry Potter',
                    description: 'Term to search for'
                },
                searchBy: {
                    type: 'string',
                    enum: ['title', 'author'],
                    example: 'title',
                    description: 'Field to search in',
                    default: 'title'
                }
            },
            required: ['searchTerm']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Search completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                searchTerm: { type: 'string', example: 'Harry' },
                searchBy: { type: 'string', example: 'title' },
                count: { type: 'number', example: 3 },
                results: { type: 'array', items: { type: 'object' } }
            }
        }
    })
    async linearSearch(
        @Body() body: { searchTerm: string; searchBy?: 'title' | 'author' },
        @Res() res: Response
    ) {
        try {
            const { searchTerm, searchBy = 'title' } = body;

            const results = await this.productService.searchByTitleOrAuthor(
                searchTerm,
                searchBy
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                searchTerm,
                searchBy,
                count: results.length,
                results,
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

    /**
     * Búsqueda Binaria por ISBN (CRÍTICO)
     */
    @Post('search/binary')
    @ApiOperation({
        summary: 'Binary search by ISBN (CRITICAL)',
        description: 'Searches in the sorted inventory using binary search algorithm (O(log n)). Used to verify pending reservations when returning books.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                isbn: {
                    type: 'string',
                    example: '978-0-306-40615-7',
                    description: 'ISBN to search for'
                }
            },
            required: ['isbn']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Search completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                isbn: { type: 'string', example: '978-0-306-40615-7' },
                found: { type: 'boolean', example: true },
                product: { type: 'object' }
            }
        }
    })
    async binarySearch(
        @Body() body: { isbn: string },
        @Res() res: Response
    ) {
        try {
            const { isbn } = body;
            const result = this.productService.searchByISBN(isbn);

            return res.status(HttpStatus.OK).json({
                success: true,
                isbn,
                found: result.found,
                product: result.product,
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

    /**
 * Genera Reporte Global ordenado por valor (Merge Sort)
 */
    @Get('reports/value')
    @ApiOperation({
        summary: 'Generate value report (Merge Sort)',
        description: 'Generates a global inventory report sorted by offer price using merge sort algorithm (O(n log n))'
    })
    @ApiQuery({
        name: 'ascending',
        required: false,
        type: Boolean,
        description: 'Sort in ascending order (true) or descending (false)',
        example: true
    })
    @ApiResponse({
        status: 200,
        description: 'Report generated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                sortOrder: { type: 'string', example: 'ascending' },
                count: { type: 'number', example: 42 },
                products: { type: 'array', items: { type: 'object' } }
            }
        }
    })
    async generateValueReport(
        @Query('ascending') ascending: string,
        @Res() res: Response
    ) {
        try {
            const isAscending = ascending !== 'false';
            const products = await this.productService.generateValueReport(isAscending);

            return res.status(HttpStatus.OK).json({
                success: true,
                sortOrder: isAscending ? 'ascending' : 'descending',
                count: products.length,
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

    /**
     * Recursión de Pila - Calcular valor total por categoría
     */
    @Get('recursion/value-by-category/:category')
    @ApiOperation({
        summary: 'Calculate total value by category (Stack Recursion)',
        description: 'Uses stack recursion to calculate the total value of all books in a specific category. Demonstrates traditional recursion using the call stack.'
    })
    @ApiParam({
        name: 'category',
        description: 'Book category',
        example: 'Academic',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure']
    })
    @ApiResponse({
        status: 200,
        description: 'Calculation completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                category: { type: 'string', example: 'Academic' },
                totalValue: { type: 'number', example: 4500 },
                bookCount: { type: 'number', example: 15 },
                executionLog: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    async calculateValueByCategory(
        @Param('category') category: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.productService.calculateTotalValueByCategory(category);

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

    /**
     * Recursión de Cola - Calcular peso promedio por categoría
     */
    @Get('recursion/weight-by-category/:category')
    @ApiOperation({
        summary: 'Calculate average weight by category (Tail Recursion)',
        description: 'Uses tail recursion to calculate the average weight of all books in a specific category. Demonstrates tail call optimization where the result accumulates in parameters.'
    })
    @ApiParam({
        name: 'category',
        description: 'Book category',
        example: 'Academic',
        enum: ['Academic', 'Children', 'Health', 'Horror', 'Business', 'History', 'Adventure']
    })
    @ApiResponse({
        status: 200,
        description: 'Calculation completed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                category: { type: 'string', example: 'Academic' },
                averageWeight: { type: 'number', example: 1.875 },
                totalWeight: { type: 'number', example: 28.125 },
                bookCount: { type: 'number', example: 15 },
                executionLog: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    async calculateWeightByCategory(
        @Param('category') category: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.productService.calculateAverageWeightByCategory(category);

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

    /**
 * @route GET /api/product/sort-by-price
 * @desc Ordena productos por precio usando Merge Sort (público para clientes)
 * @access Public
 * @query ascending (optional) - true para ascendente, false para descendente
 */
    @Get('sort-by-price')
    async sortProductsByPrice(@Query('ascending') ascending?: string) {
        try {
            const isAscending = ascending !== 'false'; // Default: true (ascendente)
            const sortedProducts = await this.productService.sortProductsByPrice(isAscending);

            return {
                success: true,
                products: sortedProducts,
                message: `Products sorted by price ${isAscending ? 'ascending' : 'descending'}`,
            };
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }
}
