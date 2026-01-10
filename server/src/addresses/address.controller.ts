import { Body, Controller, Get, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { AddressService } from './address.service';
import { AddAddressRequestDto } from './dto/add-address-request.dto';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import type { Response } from 'express';

@ApiTags('Address')
@Controller('address')
@UseGuards(AuthGuard)
@ApiCookieAuth('token')
export class AddressController {
    constructor(private readonly addressService: AddressService) { }

    @Post('add')
    @ApiOperation({ summary: 'Add address for user order' })
    @ApiBody({ type: AddAddressRequestDto })
    @ApiResponse({
        status: 200,
        description: 'Address created successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async addAddress(
        @Body() body: AddAddressRequestDto,
        @UserId() userId: string,
        @Res() res: Response,
    ) {
        try {
            const result = await this.addressService.addAddress(
                userId,
                body.address,
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

    @Get('get')
    @ApiOperation({ summary: 'Get addresses for user order' })
    @ApiResponse({
        status: 200,
        description: 'Addresses retrieved successfully',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getAddress(@UserId() userId: string, @Res() res: Response) {
        try {
            const addresses = await this.addressService.getAddresses(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                addresses,
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