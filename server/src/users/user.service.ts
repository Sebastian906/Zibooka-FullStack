import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
    ) { }

    async register(registerUserDto: RegisterUserDto): Promise<{ token: string, user: UserResponseDto }> {
        try {
            const { name, email, password, phone } = registerUserDto;

            // Checking if user already exists
            const exists = await this.userModel.findOne({ email });
            if (exists) {
                throw new ConflictException('User already exists');
            }

            // Hash user password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const newUser = new this.userModel({
                name,
                email,
                password: hashedPassword,
                phone,
            });

            const user = await newUser.save();

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id },
                this.configService.getOrThrow<string>('JWT_SECRET'),
                { expiresIn: '7d' }
            );

            // Return user data without password
            return {
                token,
                user: {
                    email: user.email,
                    name: user.name,
                },
            };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async login(userLoginDto: UserLoginDto): Promise<{ token: string; user: UserResponseDto }> {
        try {
            const { email, password, phone } = userLoginDto;

            // Find user by email
            const user = await this.userModel.findOne({ email });

            if (!user) {
                throw new UnauthorizedException('Invalid credentials');
            }

            // Compare passwords
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid credentials');
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id },
                this.configService.getOrThrow<string>('JWT_SECRET'),
                { expiresIn: '7d' }
            );

            // Return user data without password
            return {
                token,
                user: {
                    email: user.email,
                    name: user.name,
                },
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async isAuthenticated(userId: string): Promise<{ user: UserResponseDto }> {
        try {
            const user = await this.userModel.findById(userId).select('-password');

            if (!user) {
                throw new NotFoundException('User not found');
            }

            return {
                user: {
                    email: user.email,
                    name: user.name,
                },
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async logout(): Promise<{ message: string }> {
        // Aquí podrías agregar lógica adicional en el futuro:
        // - Invalidar tokens en una blacklist
        // - Registrar el logout en logs
        // - Actualizar última actividad del usuario
        // - Limpiar sesiones activas

        return {
            message: 'Successfully logged out',
        };
    }

    async getUserById(userId: string): Promise<UserResponseDto> {
        try {
            const user = await this.userModel.findById(userId).select('-password');

            if (!user) {
                throw new NotFoundException('User not found');
            }

            return {
                email: user.email,
                name: user.name,
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
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

            if (!userData) {
                throw new NotFoundException('User not found');
            }

            const cartData = userData.cartData || {};

            if (cartData[itemId]) {
                cartData[itemId] += 1;
            } else {
                cartData[itemId] = 1;
            }

            await this.userModel.findByIdAndUpdate(userId, { cartData });

            return { message: 'Added to Cart' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
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

            if (!userData) {
                throw new NotFoundException('User not found');
            }

            const cartData = userData.cartData || {};

            cartData[itemId] = quantity;

            await this.userModel.findByIdAndUpdate(userId, { cartData });

            return { message: 'Cart Updated' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }
}