import { ConflictException, Inject, Injectable, InternalServerErrorException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UserLoginDto } from './dto/user-login.dto';
import { AddToCartDto } from 'src/carts/dto/add-to-cart.dto';
import { UpdateCartDto } from 'src/carts/dto/update-cart.dto';
import { v2 as cloudinary } from 'cloudinary';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from 'src/email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
        private emailService: EmailService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        // Configure cloudinary
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLDN_NAME'),
            api_key: this.configService.get<string>('CLDN_API_KEY'),
            api_secret: this.configService.get<string>('CLDN_SECRET_KEY'),
        });
    }

    async register(registerUserDto: RegisterUserDto): Promise<{ token: string; user: UserResponseDto }> {
        try {
            const { name, email, password, phone } = registerUserDto;

            // Checking if user already exists
            const exists = await this.userModel.findOne({ email });
            if (exists) throw new ConflictException('User already exists');

            // Hash user password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const newUser = new this.userModel({ name, email, password: hashedPassword, phone });
            const user = await newUser.save();

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id },
                this.configService.getOrThrow<string>('JWT_SECRET'),
                { expiresIn: '7d' },
            );

            // Return user data without password
            return {
                token,
                user: { email: user.email, name: user.name, profileImage: user.profileImage ?? '' },
            };
        } catch (error: any) {
            if (error instanceof ConflictException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async login(userLoginDto: UserLoginDto): Promise<{ token: string; adminToken?: string; user: UserResponseDto; expiresIn: number; isAdmin: boolean }> {
        try {
            const { email, password } = userLoginDto;

            const user = await this.userModel.findOne({ email });
            if (!user) throw new UnauthorizedException('Invalid credentials');

            // Usuarios OAuth sin contraseña no pueden logear con email/password
            if (!user.password) {
                throw new UnauthorizedException('This account uses Google authentication. Please log in with Google.');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

            // Check if user email matches admin email
            const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
            const isAdmin = user.email === adminEmail;

            const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
            const tokenExpiry = '7d';

            // Generar session token único
            const sessionToken = jwt.sign(
                { session: new Date().getTime() },
                this.configService.getOrThrow<string>('JWT_SECRET'),
            );

            // Token de acceso con expiración de 7 días
            const expiresIn = 7 * 24 * 60 * 60;
            const token = jwt.sign(
                { id: user._id, session: sessionToken },
                jwtSecret,
                { expiresIn: tokenExpiry },
            );

            let adminToken: string | undefined;
            if (isAdmin) {
                adminToken = jwt.sign(
                    { email: user.email },
                    jwtSecret,
                    { expiresIn: tokenExpiry },
                );
            }

            // Actualizar última actividad y sesión
            await this.userModel.findByIdAndUpdate(user._id, {
                lastLogin: new Date(),
                lastActivity: new Date(),
                sessionToken,
            });

            console.log(`[UserService] User ${user.email} logged in at ${new Date().toISOString()}`);

            return {
                token,
                adminToken,
                user: { email: user.email, name: user.name, profileImage: user.profileImage ?? '' },
                expiresIn,
                isAdmin,
            };
        } catch (error: any) {
            if (error instanceof UnauthorizedException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async isAuthenticated(userId: string): Promise<{ user: UserResponseDto; isAdmin: boolean }> {
        try {
            const user = await this.userModel.findById(userId).select('-password');
            if (!user) throw new NotFoundException('User not found');

            // Check if user email matches admin email
            const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
            const isAdmin = user.email === adminEmail;

            return {
                user: { email: user.email, name: user.name, profileImage: user.profileImage ?? '' },
                isAdmin,
            };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async logout(userId: string): Promise<{ message: string }> {
        try {
            const user = await this.userModel.findById(userId);
            if (user) {
                // Registrar última actividad
                await this.userModel.findByIdAndUpdate(userId, {
                    lastLogout: new Date(),
                });
                console.log(`[UserService] User ${user.email} logged out at ${new Date().toISOString()}`);
            }
            return { message: 'Successfully logged out' };
        } catch (error: any) {
            throw new InternalServerErrorException('Error during logout');
        }
    }

    async getUserById(userId: string): Promise<UserResponseDto> {
        try {
            const cacheKey = `user:${userId}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<UserResponseDto>(cacheKey);
            if (cached) {
                return cached;
            }

            const user = await this.userModel.findById(userId).select('-password');

            if (!user) throw new NotFoundException('User not found');

            const result: UserResponseDto = { email: user.email, name: user.name, profileImage: user.profileImage ?? '' };

            // Guardar en caché por 60 segundos
            await this.cacheManager.set(cacheKey, result, 60);

            return result;
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async getProfile(userId: string): Promise<{ user: any }> {
        try {
            const cacheKey = `user:profile:${userId}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<{ user: any }>(cacheKey);
            if (cached) {
                return cached;
            }

            const user = await this.userModel.findById(userId).select('-password');
            if (!user) throw new NotFoundException('User not found');

            const result = {
                user: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    profileImage: user.profileImage ?? '',
                },
            };

            // Guardar en caché por 60 segundos
            await this.cacheManager.set(cacheKey, result, 60);

            return result;
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async updateProfile(
        userId: string,
        updateProfileDto: UpdateProfileDto,
        profileImageFile?: Express.Multer.File,
    ): Promise<{ message: string; user: any }> {
        try {
            const user = await this.userModel.findById(userId);
            if (!user) throw new NotFoundException('User not found');

            // Check if email is being changed and if it's already taken
            await this.checkEmailUniqueness(updateProfileDto.email, userId, user.email);

            // Handle password change
            if (updateProfileDto.newPassword) {
                // Si el usuario no tiene contraseña (OAuth), verificar que proporciona una actual
                if (!user.password && !updateProfileDto.currentPassword) {
                    throw new BadRequestException('Please enter a new password to set up password authentication');
                }

                // Si tiene contraseña actual, validarla; si no, solo hashear la nueva
                if (user.password) {
                    user.password = await this.validatePasswordChange(
                        updateProfileDto.currentPassword,
                        updateProfileDto.newPassword,
                        user.password,
                    );
                } else {
                    user.password = await bcrypt.hash(updateProfileDto.newPassword, 10);
                }
            }

            // Handle profile image upload
            if (profileImageFile) {
                user.profileImage = await this.uploadProfileImage(
                    profileImageFile,
                    user.profileImage,
                );
            }

            // Update other fields
            user.name = updateProfileDto.name;
            user.email = updateProfileDto.email;
            user.phone = updateProfileDto.phone;

            await user.save();

            // Invalidar caché del usuario
            await this.cacheManager.del(`user:${userId}`);
            await this.cacheManager.del(`user:profile:${userId}`);

            return {
                message: 'Profile updated successfully',
                user: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    profileImage: user.profileImage,
                },
            };
        } catch (error: any) {
            if (
                error instanceof NotFoundException ||
                error instanceof ConflictException ||
                error instanceof BadRequestException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Solicitud de recuperación de contraseña
     * Genera un token JWT con expiración de 1 hora y envía email
     */
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
        try {
            const { email } = forgotPasswordDto;

            // Verificar que el usuario existe
            const user = await this.userModel.findOne({ email });

            if (!user) {
                // Por seguridad, no revelamos si el email existe o no
                return {
                    message: 'If this email exists, a password reset link has been sent',
                };
            }

            // Generar token de reseteo con expiración de 1 hora
            const resetToken = jwt.sign(
                { id: user._id, email: user.email, type: 'password-reset' },
                this.configService.getOrThrow<string>('JWT_SECRET'),
                { expiresIn: '1h' },
            );

            // Enviar email
            await this.emailService.sendPasswordResetEmail(
                user.email,
                resetToken,
                user.name,
            );

            console.log(`[UserService] Password reset email sent to: ${user.email}`);

            return {
                message: 'If this email exists, a password reset link has been sent',
            };
        } catch (error: any) {
            console.error('[UserService] Error in forgotPassword:', error);
            throw new InternalServerErrorException('Error processing password reset request');
        }
    }

    /**
     * Reseteo de contraseña
     * Valida el token y actualiza la contraseña
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        try {
            const { token, newPassword, confirmPassword } = resetPasswordDto;

            // Verificar que las contraseñas coincidan
            if (newPassword !== confirmPassword) {
                throw new BadRequestException('Passwords do not match');
            }

            // Verificar y decodificar el token
            let decoded: any;
            try {
                decoded = jwt.verify(
                    token,
                    this.configService.getOrThrow<string>('JWT_SECRET'),
                );
            } catch (error: any) {
                if (error.name === 'TokenExpiredError') {
                    throw new UnauthorizedException('Reset link has expired. Please request a new one');
                }
                throw new UnauthorizedException('Invalid reset link');
            }

            // Verificar que sea un token de reset
            if (decoded.type !== 'password-reset') {
                throw new UnauthorizedException('Invalid reset link');
            }

            // Buscar usuario
            const user = await this.userModel.findById(decoded.id);
            if (!user) throw new NotFoundException('User not found');

            // Verificar que el email del token coincida con el del usuario
            if (user.email !== decoded.email) {
                throw new UnauthorizedException('Invalid reset link');
            }

            // Hashear nueva contraseña
            // Actualizar contraseña
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();

            // Enviar email de confirmación
            await this.emailService.sendPasswordChangedConfirmation(
                user.email,
                user.name,
            );

            console.log(`[UserService] Password reset successful for: ${user.email}`);

            return {
                message: 'Password has been reset successfully. You can now log in with your new password',
            };
        } catch (error: any) {
            if (
                error instanceof BadRequestException ||
                error instanceof UnauthorizedException ||
                error instanceof NotFoundException
            ) {
                throw error;
            }
            throw new InternalServerErrorException('Error resetting password');
        }
    }

    /**
     * Busca un usuario por googleId o email, o crea uno nuevo.
     * Si el usuario existe por email (sin googleId), vincula la cuenta Google automáticamente.
     * Si el usuario existe por googleId, retorna el usuario existente.
     * Si no existe, crea un nuevo usuario con los datos de Google.
     */
    async findOrCreateByGoogle(googleProfile: {
        googleId: string;
        email: string;
        name: string;
        profileImage: string | null;
    }): Promise<{ token: string; user: UserResponseDto }> {
        try {
            const { googleId, email, name, profileImage } = googleProfile;

            // 1. Buscar por googleId (usuario ya vinculado)
            let user = await this.userModel.findOne({ googleId });

            if (user) {
                // Usuario existente con Google vinculado - actualizar datos si es necesario
                const updates: any = {};
                if (profileImage && user.profileImage !== profileImage) {
                    updates.profileImage = profileImage;
                }
                if (Object.keys(updates).length > 0) {
                    await this.userModel.findByIdAndUpdate(user._id, updates);
                }
                return this.generateOAuthResponse(user);
            }

            // 2. Buscar por email (usuario existente sin Google vinculado)
            user = await this.userModel.findOne({ email });

            if (user) {
                // Vincular cuenta Google automáticamente
                await this.userModel.findByIdAndUpdate(user._id, {
                    googleId,
                    ...(profileImage && !user.profileImage ? { profileImage } : {}),
                });
                console.log(`[UserService] Google account linked for user: ${email}`);
                return this.generateOAuthResponse(user);
            }

            // 3. Crear nuevo usuario con datos de Google
            const newUser = new this.userModel({
                name,
                email,
                password: null, // Sin contraseña - solo autenticación OAuth
                phone: null,    // Teléfono opcional, se agrega desde el perfil
                googleId,
                profileImage,
            });

            const savedUser = await newUser.save();
            console.log(`[UserService] New user created via Google: ${email}`);

            return this.generateOAuthResponse(savedUser);
        } catch (error: any) {
            console.error('[UserService] Error in findOrCreateByGoogle:', error);
            throw new InternalServerErrorException('Error processing Google authentication');
        }
    }

    /**
     * Genera la respuesta estándar de autenticación OAuth (JWT + datos de usuario).
     * Replica la lógica del método login() para mantener consistencia.
     */
    private async generateOAuthResponse(user: UserDocument): Promise<{ token: string; user: UserResponseDto }> {
        const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
        const tokenExpiry = '7d';

        // Generar session token único
        const sessionToken = jwt.sign(
            { session: new Date().getTime() },
            jwtSecret,
        );

        // Token de acceso con expiración de 7 días
        const token = jwt.sign(
            { id: user._id, session: sessionToken },
            jwtSecret,
            { expiresIn: tokenExpiry },
        );

        // Actualizar última actividad y sesión
        await this.userModel.findByIdAndUpdate(user._id, {
            lastLogin: new Date(),
            lastActivity: new Date(),
            sessionToken,
        });

        return {
            token,
            user: {
                email: user.email,
                name: user.name,
                profileImage: user.profileImage ?? '',
            },
        };
    }

    /**
     * Retorna el estado de vinculación de cuentas del usuario.
     */
    async getLinkStatus(userId: string): Promise<{ hasPassword: boolean; googleLinked: boolean }> {
        try {
            const user = await this.userModel.findById(userId).select('password googleId');
            if (!user) throw new NotFoundException('User not found');

            return {
                hasPassword: !!user.password,
                googleLinked: !!user.googleId,
            };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async addToCart(
        userId: string,
        addToCartDto: AddToCartDto,
    ): Promise<{ message: string }> {
        try {
            const { itemId } = addToCartDto;
            const userData = await this.userModel.findById(userId);
            if (!userData) throw new NotFoundException('User not found');

            const cartData = userData.cartData || {};
            cartData[itemId] = (cartData[itemId] ?? 0) + 1;

            await this.userModel.findByIdAndUpdate(userId, { cartData });

            // Invalidar caché del usuario
            await this.cacheManager.del(`user:${userId}`);
            await this.cacheManager.del(`user:profile:${userId}`);

            return { message: 'Added to Cart' };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    async updateCart(
        userId: string,
        updateCartDto: UpdateCartDto,
    ): Promise<{ message: string }> {
        try {
            const { itemId, quantity } = updateCartDto;
            const userData = await this.userModel.findById(userId);
            if (!userData) throw new NotFoundException('User not found');

            const cartData = userData.cartData || {};

            if (quantity <= 0) {
                delete cartData[itemId];
            } else {
                cartData[itemId] = quantity;
            }

            await this.userModel.findByIdAndUpdate(userId, { cartData });

            // Invalidar caché del usuario
            await this.cacheManager.del(`user:${userId}`);
            await this.cacheManager.del(`user:profile:${userId}`);

            return { message: 'Cart Updated' };
        } catch (error: any) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException(error.message);
        }
    }

    // PRIVATE HELPERS
    // Throws ConflictException when the new email is already taken by another user.
    private async checkEmailUniqueness(
        newEmail: string,
        currentUserId: string,
        currentEmail: string,
    ): Promise<void> {
        if (newEmail === currentEmail) return;

        const emailExists = await this.userModel.findOne({
            email: newEmail,
            _id: { $ne: currentUserId },
        });

        if (emailExists) throw new ConflictException('Email already in use');
    }

    // Validates the current password and returns the bcrypt hash of the new password. Throws BadRequestException / UnauthorizedException on failure.
    private async validatePasswordChange(
        currentPassword: string | undefined,
        newPassword: string,
        storedHash: string,
    ): Promise<string> {
        if (!currentPassword) {
            throw new BadRequestException(
                'Current password is required to change password',
            );
        }

        const isValid = await bcrypt.compare(currentPassword, storedHash);
        if (!isValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        return bcrypt.hash(newPassword, 10);
    }

    // Deletes the old Cloudinary image (if any), uploads the new file, and returns the secure URL.
    private async uploadProfileImage(
        file: Express.Multer.File,
        existingImageUrl?: string | null,
    ): Promise<string> {
        if (existingImageUrl) {
            const publicId = existingImageUrl.split('/').pop()?.split('.')[0];
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }

        const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            folder: 'profile_images',
        });

        return result.secure_url;
    }
}