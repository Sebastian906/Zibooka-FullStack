import { Body, Controller, Get, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { AdminLoginDto } from './dto/admin-login.dto';
import type { Response } from 'express';
import { AdminAuthGuard } from 'src/common/guards/admin-auth/admin-auth.guard';
import { AdminEmail } from 'src/common/decorators/admin/admin-email.decorator';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly configService: ConfigService
    ) { }

    private getCookieOptions() {
        const isProduction = this.configService.get<string>('APP_ENV') === 'production';

        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? ('none' as const) : ('lax' as const),
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
            domain: isProduction ? '.onrender.com' : undefined,
        };
    }

    @Post('login')
    @ApiOperation({ summary: 'Admin login' })
    @ApiBody({ type: AdminLoginDto })
    @ApiResponse({
        status: 200,
        description: 'Admin successfully logged in',
    })
    @ApiResponse({ status: 400, description: 'Bad request - Validation error' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() adminLoginDto: AdminLoginDto,
        @Res() res: Response,
    ) {
        try {
            const { token, message } = await this.adminService.login(adminLoginDto);

            res.cookie('adminToken', token, this.getCookieOptions());

            return res.status(HttpStatus.OK).json({
                success: true,
                message,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('logout')
    @ApiOperation({ summary: 'Admin logout' })
    @ApiResponse({
        status: 200,
        description: 'Admin successfully logged out',
    })
    async logout(@Res() res: Response) {
        try {
            const result = await this.adminService.logout();

            res.clearCookie('adminToken', this.getCookieOptions());

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Get('is-admin')
    @UseGuards(AdminAuthGuard)
    @ApiCookieAuth('adminToken')
    @ApiOperation({ summary: 'Verify admin authentication' })
    @ApiResponse({
        status: 200,
        description: 'Admin is authenticated',
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async isAdmin(
        @AdminEmail() adminEmail: string,
        @Res() res: Response,
    ) {
        try {
            const result = await this.adminService.verifyAdmin(adminEmail);

            return res.status(HttpStatus.OK).json({
                success: true,
                email: result.email,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}
