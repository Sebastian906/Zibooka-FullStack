import { Body, Controller, Get, HttpStatus, Post, Put, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import express from 'express';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { UserId } from 'src/common/decorators/users/user-id.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

    @Get('profile')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile retrieved successfully'
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    async getProfile(
        @UserId() userId: string,
        @Res() res: express.Response,
    ) {
        try {
            const result = await this.userService.getProfile(userId);

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

    @Put('update-profile')
    @UseGuards(AuthGuard)
    @ApiCookieAuth('token')
    @UseInterceptors(
        FileInterceptor('profileImage', {
            storage: diskStorage({}),
        }),
    )
    @ApiOperation({ summary: 'Update user profile' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'user@example.com' },
                phone: { type: 'string', example: '+1234567890' },
                currentPassword: { type: 'string', example: 'currentPassword123' },
                newPassword: { type: 'string', example: 'newPassword123' },
                profileImage: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully'
    })
    @ApiResponse({ status: 401, description: 'Not authenticated' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async updateProfile(
        @UserId() userId: string,
        @Body() updateProfileDto: UpdateProfileDto,
        @UploadedFile() profileImage: Express.Multer.File,
        @Res() res: express.Response,
    ) {
        try {
            const result = await this.userService.updateProfile(
                userId,
                updateProfileDto,
                profileImage,
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
                user: result.user,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }

    @Post('forgot-password')
    @ApiOperation({
        summary: 'Request password reset',
        description: 'Sends a password reset link to the user\'s email. Link expires in 1 hour.'
    })
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'If email exists, reset link has been sent',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'If this email exists, a password reset link has been sent'
                }
            }
        }
    })
    @ApiResponse({ status: 500, description: 'Error processing request' })
    async forgotPassword(
        @Body() forgotPasswordDto: ForgotPasswordDto,
        @Res() res: express.Response,
    ) {
        try {
            const result = await this.userService.forgotPassword(forgotPasswordDto);

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

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset password',
        description: 'Resets user password using the token from email'
    })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password reset successful',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Password has been reset successfully. You can now log in with your new password'
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Passwords do not match' })
    @ApiResponse({ status: 401, description: 'Invalid or expired reset link' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async resetPassword(
        @Body() resetPasswordDto: ResetPasswordDto,
        @Res() res: express.Response,
    ) {
        try {
            const result = await this.userService.resetPassword(resetPasswordDto);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message,
            });
        }
    }
}
