import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PlaceOrderCODDto } from './dto/place-order-cod.dto';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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