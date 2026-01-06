import { Body, Controller, Get, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { RegisterUserDto } from './schemas/dto/register-user.dto';
import { UserResponseDto } from './schemas/dto/user-response.dto';
import express from 'express';
import { UserLoginDto } from './schemas/dto/user-login.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { UserId } from 'src/common/decorators/users/user-id.decorator';

@ApiTags('Users')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiBody({ type: RegisterUserDto })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request - Validation error' })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(
        @Body() registerUserDto: RegisterUserDto,
        @Res() res: express.Response,
    ) {
        try {
            const { token, user } = await this.userService.register(registerUserDto);

            // Cookie options
            const cookieOptions = {
                httpOnly: true,
                secure: this.configService.get<string>('APP_ENV') === 'production',
                sameSite: this.configService.get<string>('APP_ENV') === 'production'
                    ? ('none' as const)
                    : ('strict' as const),
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            };

            res.cookie('token', token, cookieOptions);

            return res.status(HttpStatus.CREATED).json({
                success: true,
                user,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('login')
    @ApiOperation({ summary: 'Login user' })
    @ApiBody({ type: UserLoginDto })
    @ApiResponse({
        status: 200,
        description: 'User successfully logged in',
        type: UserResponseDto
    })
    @ApiResponse({ status: 400, description: 'Bad request - Validation error' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() userLoginDto: UserLoginDto,
        @Res() res: express.Response,
    ) {
        try {
            const { token, user } = await this.userService.login(userLoginDto);
            // Cookie options
            const cookieOptions = {
                httpOnly: true,
                secure: this.configService.get<string>('APP_ENV') === 'production',
                sameSite: this.configService.get<string>('APP_ENV') === 'production'
                    ? ('none' as const)
                    : ('strict' as const),
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            };

            res.cookie('token', token, cookieOptions);

            return res.status(HttpStatus.OK).json({
                success: true,
                user,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({
        status: 200,
        description: 'User successfully logged out'
    })
    async logout(@Res() res: express.Response) {
        try {
            // Llamar al service para ejecutar lógica de negocio
            const result = await this.userService.logout();

            // El controller solo maneja la parte HTTP (cookies)
            const cookieOptions = {
                httpOnly: true,
                secure: this.configService.get<string>('APP_ENV') === 'production',
                sameSite: this.configService.get<string>('APP_ENV') === 'production'
                    ? ('none' as const)
                    : ('strict' as const),
            };

            res.clearCookie('token', cookieOptions);

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

    @Get('is-auth')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({ summary: 'Check if user is authenticated' })
    @ApiResponse({
        status: 200,
        description: 'User is authenticated',
        type: UserResponseDto
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async isAuth(
        @UserId() userId: string,
        @Res() res: express.Response,
    ) {
        try {
            // Delegar toda la lógica al service
            const result = await this.userService.isAuthenticated(userId);

            return res.status(HttpStatus.OK).json({
                success: true,
                user: result.user,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}
