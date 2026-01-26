import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShelfService } from './shelf.service';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { CreateShelfDto } from './dtos/create-shelf.dto';
import type { Response } from 'express';
import { AssignBookDto } from './dtos/assign-book.dto';

@ApiTags('Shelf')
@Controller('shelf')
@UseGuards(AdminAuthGuard)
@ApiCookieAuth('adminToken')
export class ShelfController {
    constructor(private readonly shelfService: ShelfService) { }

    @Post('create')
    @ApiOperation({ summary: 'Create a new shelf (Admin only)' })
    @ApiBody({ type: CreateShelfDto })
    @ApiResponse({ status: 201, description: 'Shelf created successfully' })
    @ApiResponse({ status: 400, description: 'Shelf code already exists' })
    async createShelf(
        @Body() createShelfDto: CreateShelfDto,
        @Res() res: Response
    ) {
        try {
            const shelf = await this.shelfService.createShelf(createShelfDto);

            return res.status(HttpStatus.CREATED).json({
                success: true,
                message: 'Shelf created successfully',
                shelf,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('list')
    @ApiOperation({ summary: 'List all shelves (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Shelves retrieved successfully',
    })
    async listShelves(@Res() res: Response) {
        try {
            const shelves = await this.shelfService.listShelves();

            return res.status(HttpStatus.OK).json({
                success: true,
                count: shelves.length,
                shelves,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('assign-book')
    @ApiOperation({ summary: 'Assign a book to a shelf (Admin only)' })
    @ApiBody({ type: AssignBookDto })
    @ApiResponse({ status: 200, description: 'Book assigned successfully' })
    @ApiResponse({ status: 400, description: 'Shelf capacity exceeded or book already assigned' })
    async assignBook(
        @Body() assignBookDto: AssignBookDto,
        @Res() res: Response
    ) {
        try {
            const result = await this.shelfService.assignBook(
                assignBookDto.shelfId,
                assignBookDto.bookId
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
                shelf: result.shelf,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('dangerous-combinations/:shelfId')
    @ApiOperation({
        summary: 'Find dangerous book combinations (Brute Force)',
        description: 'Uses brute force algorithm to find all 4-book combinations exceeding 8 Kg'
    })
    @ApiParam({ name: 'shelfId', description: 'Shelf ID', example: '507f1f77bcf86cd799439011' })
    @ApiResponse({
        status: 200,
        description: 'Dangerous combinations found',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                count: { type: 'number', example: 5 },
                combinations: { type: 'array' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Shelf not found' })
    async findDangerousCombinations(
        @Param('shelfId') shelfId: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.shelfService.findDangerousCombinations(shelfId);

            return res.status(HttpStatus.OK).json({
                success: true,
                count: result.count,
                combinations: result.combinations,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('optimize/:shelfId')
    @ApiOperation({
        summary: 'Optimize shelf value (Backtracking)',
        description: 'Uses backtracking to find the best book combination maximizing value without exceeding weight limit'
    })
    @ApiParam({ name: 'shelfId', description: 'Shelf ID', example: '507f1f77bcf86cd799439011' })
    @ApiResponse({
        status: 200,
        description: 'Optimal combination found',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                bestCombination: {
                    type: 'object',
                    properties: {
                        books: { type: 'array' },
                        totalWeight: { type: 'number', example: 7.8 },
                        totalValue: { type: 'number', example: 450 }
                    }
                },
                maxWeight: { type: 'number', example: 8 }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Shelf not found' })
    async optimizeShelf(
        @Param('shelfId') shelfId: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.shelfService.optimizeShelf(shelfId);

            return res.status(HttpStatus.OK).json({
                success: true,
                bestCombination: result.bestCombination,
                maxWeight: result.maxWeight,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Delete('remove-book/:shelfId/:bookId')
    @ApiOperation({ summary: 'Remove a book from a shelf (Admin only)' })
    @ApiParam({ name: 'shelfId', description: 'Shelf ID' })
    @ApiParam({ name: 'bookId', description: 'Book ID' })
    @ApiResponse({ status: 200, description: 'Book removed successfully' })
    @ApiResponse({ status: 404, description: 'Shelf or book not found' })
    async removeBook(
        @Param('shelfId') shelfId: string,
        @Param('bookId') bookId: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.shelfService.removeBook(shelfId, bookId);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
                shelf: result.shelf,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }
}