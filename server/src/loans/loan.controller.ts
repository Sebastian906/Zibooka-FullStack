import { Body, Controller, Get, HttpStatus, NotFoundException, Param, Post, Put, Query, Res, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';
import { LoanStatsResponseDto } from './dto/loan-stats-response.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

// Custom decorator to skip class-level guards
export const SkipAuthGuard = () => SetMetadata('skipAuthGuard', true);

@ApiTags('Loans')
@Controller('loan')
@UseGuards(AuthGuard)
@ApiCookieAuth('token')
export class LoanController {
    constructor(private readonly loanService: LoanService) { }

    @Get('history')
    @ApiOperation({
        summary: 'Get user loan history (Stack - LIFO)',
        description: 'Returns loan history in LIFO order (most recent first)'
    })
    @ApiResponse({
        status: 200,
        description: 'History retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                count: { type: 'number', example: 5 },
                loans: { type: 'array' }
            }
        }
    })
    async getUserHistory(@UserId() userId: string, @Query() pagination: PaginationDto, @Res() res: Response) {
        try {
            const result = await this.loanService.getUserLoanHistory(userId, pagination);

            return res.status(HttpStatus.OK).json({
                success: true,
                loans: result.data,
                pagination: result.pagination,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('create')
    @ApiOperation({ summary: 'Create a loan (Push to stack)' })
    @ApiBody({ type: CreateLoanDto })
    @ApiResponse({
        status: 201,
        description: 'Loan created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Loan created successfully' },
                loan: { type: 'object' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Book not available' })
    async createLoan(
        @UserId() userId: string,
        @Body() createLoanDto: CreateLoanDto,
        @Res() res: Response
    ) {
        try {
            const loan = await this.loanService.createLoan(createLoanDto.bookId, userId);

            return res.status(HttpStatus.CREATED).json({
                success: true,
                message: 'Loan created successfully',
                loan,
            });
        } catch (error: any) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('last-active')
    @ApiOperation({
        summary: 'Get last active loan (Peek stack)',
        description: 'Returns the most recent active loan without removing it'
    })
    @ApiResponse({
        status: 200,
        description: 'Last loan retrieved',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                loan: { type: 'object', nullable: true }
            }
        }
    })
    async getLastActiveLoan(@UserId() userId: string, @Res() res: Response) {
        try {
            const loan = await this.loanService.getLastActiveLoan(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                loan,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('return/:loanId')
    @ApiOperation({
        summary: 'Return a book (CRITICAL - uses binary search)',
        description: 'Returns book and checks for pending reservations using binary search on ISBN'
    })
    @ApiParam({ name: 'loanId', description: 'Loan ID', example: '507f1f77bcf86cd799439011' })
    @ApiResponse({
        status: 200,
        description: 'Book returned successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                loan: { type: 'object' },
                assignedToReservation: { type: 'boolean', example: false },
                reservationInfo: { type: 'object', nullable: true }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Loan not active or not found' })
    async returnBook(@Param('loanId') loanId: string, @Res() res: Response) {
        try {
            const result: any = await this.loanService.returnBook(loanId);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.assignedToReservation
                    ? 'Book returned and assigned to next reservation'
                    : 'Book returned successfully',
                loan: result.loan,
                assignedToReservation: result.assignedToReservation,
                reservationInfo: result.reservationInfo,
            });
        } catch (error: any) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get user loan statistics' })
    @ApiResponse({
        status: 200,
        description: 'Stats retrieved successfully',
        type: LoanStatsResponseDto
    })
    async getUserStats(@UserId() userId: string, @Res() res: Response) {
        try {
            const stats = await this.loanService.getUserLoanStats(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                stats,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('admin/all')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get all loans (Admin only)',
        description: 'Returns all loans in the system with full user and book details'
    })
    @ApiResponse({
        status: 200,
        description: 'All loans retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                count: { type: 'number', example: 25 },
                loans: { type: 'array' }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
    async getAllLoans(@Query() pagination: PaginationDto, @Res() res: Response) {
        try {
            const result = await this.loanService.getAllLoans(pagination);

            return res.status(HttpStatus.OK).json({
                success: true,
                loans: result.data,
                pagination: result.pagination,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('admin/high-risk')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Get high risk loans (Admin only)',
        description: 'Returns loans flagged as high risk for review'
    })
    @ApiQuery({ name: 'reviewed', required: false, type: Boolean, description: 'Filter by reviewed status' })
    @ApiResponse({
        status: 200,
        description: 'High risk loans retrieved successfully',
    })
    async getHighRiskLoans(
        @Query('reviewed') reviewed: string | undefined,
        @Res() res: Response
    ) {
        try {
            const reviewedBool = reviewed !== undefined ? reviewed === 'true' : undefined;
            const highRiskLoans = await this.loanService.getHighRiskLoans(reviewedBool);

            return res.status(HttpStatus.OK).json({
                success: true,
                count: highRiskLoans.length,
                highRiskLoans,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Put('admin/high-risk/:alertId/review')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Review a high risk loan alert (Admin only)',
        description: 'Marks a high risk loan alert as reviewed with admin notes'
    })
    @ApiParam({ name: 'alertId', description: 'High Risk Loan Alert ID' })
    @ApiBody({ schema: { properties: { adminNotes: { type: 'string' } } } })
    @ApiResponse({
        status: 200,
        description: 'Alert reviewed successfully',
    })
    async reviewHighRiskLoan(
        @Param('alertId') alertId: string,
        @Body('adminNotes') adminNotes: string,
        @Res() res: Response
    ) {
        try {
            const alert = await this.loanService.reviewHighRiskLoan(alertId, adminNotes);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Alert reviewed successfully',
                alert,
            });
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('admin/train-overdue')
    @SkipAuthGuard()
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({
        summary: 'Train overdue prediction model (Admin only)',
        description: 'Triggers retraining of the overdue prediction model using database data'
    })
    @ApiResponse({
        status: 200,
        description: 'Model trained successfully',
    })
    async trainOverdueModel(@Res() res: Response) {
        try {
            const result = await this.loanService['predictionClient'].trainOverdueFromDatabase();

            if (!result) {
                return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                    success: false,
                    message: 'ML service unavailable or training failed',
                });
            }

            return res.status(HttpStatus.OK).json({
                success: true,
                ...result,
            });
        } catch (error: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}