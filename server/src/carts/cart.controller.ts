import { Body, Controller, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { UserService } from 'src/users/user.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';
import { UpdateCartDto } from './dto/update-cart.dto';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(AuthGuard)
@ApiCookieAuth('token')
export class CartController {
    constructor(private readonly userService: UserService) { }

    @Post('add')
    @ApiOperation({ summary: 'Add item to cart' })
    @ApiBody({ type: AddToCartDto })
    @ApiResponse({ status: 200, description: 'Item added to cart successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async addToCart(
        @Body() addToCartDto: AddToCartDto,
        @UserId() userId: string,
        @Res() res: Response
    ) {
        try {
            const result = await this.userService.addToCart(userId, addToCartDto);
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

    @Post('update')
    @ApiOperation({ summary: 'Update cart item quantity' })
    @ApiBody({ type: UpdateCartDto })
    @ApiResponse({ status: 200, description: 'Cart updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async updateCart(
        @Body() updateCartDto: UpdateCartDto,
        @UserId() userId: string,
        @Res() res: Response,
    ) {
        try {
            const result = await this.userService.updateCart(userId, updateCartDto);

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
