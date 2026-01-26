import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatsResponseDto } from './dto/reservation-stats-response.dto';

@ApiTags('Reservations')
@Controller('reservation')
@UseGuards(AuthGuard)
@ApiCookieAuth('token')
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }

    @Post('add')
    @ApiOperation({
        summary: 'Add to waiting list (Enqueue)',
        description: 'Adds user to waiting list. Only allowed if book stock is 0'
    })
    @ApiBody({ type: CreateReservationDto })
    @ApiResponse({
        status: 201,
        description: 'Added to waiting list',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Added to waiting list at position 3' },
                reservation: { type: 'object' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Book is in stock or user already has reservation' })
    async addToWaitingList(
        @UserId() userId: string,
        @Body() createReservationDto: CreateReservationDto,
        @Res() res: Response
    ) {
        try {
            const reservation = await this.reservationService.addToWaitingList(
                userId,
                createReservationDto.bookId
            );

            return res.status(HttpStatus.CREATED).json({
                success: true,
                message: `Added to waiting list at position ${reservation.priority}`,
                reservation,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('waiting-list/:bookId')
    @ApiOperation({
        summary: 'Get waiting list for a book (View queue)',
        description: 'Returns all pending reservations in FIFO order'
    })
    @ApiParam({ name: 'bookId', description: 'Book ID', example: '507f1f77bcf86cd799439011' })
    @ApiResponse({
        status: 200,
        description: 'Waiting list retrieved',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                count: { type: 'number', example: 5 },
                waitingList: { type: 'array' }
            }
        }
    })
    async getWaitingList(@Param('bookId') bookId: string, @Res() res: Response) {
        try {
            const waitingList = await this.reservationService.getWaitingList(bookId);

            return res.status(HttpStatus.OK).json({
                success: true,
                count: waitingList.length,
                waitingList,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Delete('cancel/:reservationId')
    @ApiOperation({
        summary: 'Cancel reservation',
        description: 'Cancels reservation and reorders the queue'
    })
    @ApiParam({ name: 'reservationId', description: 'Reservation ID', example: '507f1f77bcf86cd799439011' })
    @ApiResponse({
        status: 200,
        description: 'Reservation cancelled',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Reservation cancelled successfully' },
                reservation: { type: 'object' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Reservation not found or not pending' })
    async cancelReservation(
        @Param('reservationId') reservationId: string,
        @Res() res: Response
    ) {
        try {
            const reservation = await this.reservationService.cancelReservation(
                reservationId
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Reservation cancelled successfully',
                reservation,
            });
        } catch (error) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('my-reservations')
    @ApiOperation({ summary: 'Get user reservation statistics' })
    @ApiResponse({
        status: 200,
        description: 'Reservations retrieved',
        type: ReservationStatsResponseDto
    })
    async getMyReservations(@UserId() userId: string, @Res() res: Response) {
        try {
            const stats = await this.reservationService.getUserReservationStats(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                stats,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}