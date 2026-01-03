import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterUserDto } from './schemas/dto/register-user.dto';
import { UserResponseDto } from './schemas/dto/user-response.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

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
}
