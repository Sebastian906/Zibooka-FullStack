import { Body, Controller, Get, Headers, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PlaceOrderCODDto } from './dto/place-order-cod.dto';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PlaceOrderStripeDto } from './dto/place-order-stripe.dto';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    // For Payment - Place Order using COD
    @Post('cod')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({ summary: 'Place order using Cash on Delivery' })
    @ApiBody({ type: PlaceOrderCODDto })
    @ApiResponse({ status: 200, description: 'Order placed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async placeOrderCOD(
        @Body() placeOrderDto: PlaceOrderCODDto,
        @UserId() userId: string,
        @Res() res: Response,
    ) {
        try {
            const result = await this.orderService.placeOrderCOD(
                userId,
                placeOrderDto,
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    // For Payment - Place Order using Stripe
    @Post('stripe')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({ summary: 'Place order using Stripe payment' })
    @ApiHeader({
        name: 'origin',
        description: 'Frontend origin URL',
        required: true,
    })
    @ApiBody({ type: PlaceOrderStripeDto })
    @ApiResponse({
        status: 200,
        description: 'Stripe checkout session created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                url: { type: 'string', example: 'https://checkout.stripe.com/...' }
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Product not found' })
    async placeOrderStripe(
        @Body() placeOrderDto: PlaceOrderStripeDto,
        @UserId() userId: string,
        @Headers('origin') origin: string,
        @Res() res: Response,
    ) {
        try {
            const result = await this.orderService.placeOrderStripe(
                userId,
                placeOrderDto,
                origin,
            );

            return res.status(HttpStatus.OK).json(result);
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    // For User - Get user orders
    @Post('user-orders')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({ summary: 'Get all orders for current user' })
    @ApiResponse({
        status: 200,
        description: 'Orders retrieved successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async userOrders(@UserId() userId: string, @Res() res: Response) {
        try {
            const orders = await this.orderService.userOrders(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                orders,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    // For Admin - Get all orders
    @Post('list')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Get all orders (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Orders retrieved successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async allOrders(@Res() res: Response) {
        try {
            const orders = await this.orderService.allOrders();

            return res.status(HttpStatus.OK).json({
                success: true,
                orders,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    // For Admin - Update order status
    @Post('status')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Update order status (Admin only)' })
    @ApiBody({ type: UpdateOrderStatusDto })
    @ApiResponse({
        status: 200,
        description: 'Order status updated successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateStatus(
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
        @Res() res: Response,
    ) {
        try {
            const result = await this.orderService.updateStatus(updateOrderStatusDto);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Get('queue/status')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Get priority queue status (Admin only)' })
    @ApiResponse({ status: 200, description: 'Queue status retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getQueueStatus(@Res() res: Response) {
        try {
            const queue = await this.orderService.getQueueStatus();
            const size = await this.orderService.getQueueSize();

            return res.status(HttpStatus.OK).json({
                success: true,
                size,
                queue,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Post('queue/process')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Process next batch of orders by priority (Admin only)' })
    @ApiQuery({ name: 'batchSize', required: false, type: Number, description: 'Number of orders to process (default: 10)' })
    @ApiResponse({ status: 200, description: 'Batch processed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async processNextBatch(
        @Query('batchSize') batchSize: string,
        @Res() res: Response,
    ) {
        try {
            const size = batchSize ? parseInt(batchSize, 10) : 10;
            const processed = await this.orderService.processNextBatch(size);

            return res.status(HttpStatus.OK).json({
                success: true,
                processed,
                count: processed.length,
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }

    @Post('queue/rebalance')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Rebalance priority queue (Admin only)' })
    @ApiResponse({ status: 200, description: 'Queue rebalanced' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async rebalanceQueue(@Res() res: Response) {
        try {
            await this.orderService.rebalanceQueue();

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'Queue rebalanced successfully',
            });
        } catch (error: any) {
            return res
                .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    message: error.message,
                });
        }
    }
}