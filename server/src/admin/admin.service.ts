import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdminService {
    constructor(private configService: ConfigService) { }

    async login(adminLoginDto: AdminLoginDto): Promise<{ token: string; message: string }> {
        const { email, password, phone } = adminLoginDto;

        const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
        const adminPassword = this.configService.get<string>('ADMIN_PASS');
        const adminPhone = this.configService.get<string>('ADMIN_PHONE');

        if (
            email === adminEmail &&
            password === adminPassword &&
            phone === adminPhone
        ) {
            const jwtSecret = this.configService.get<string>('JWT_SECRET');
            if (!jwtSecret) {
                throw new Error('JWT_SECRET is not defined');
            }
            const token = jwt.sign(
                { email },
                jwtSecret,
                { expiresIn: '7d' }
            );

            return {
                token,
                message: 'Admin logged in',
            };
        } else {
            throw new UnauthorizedException('Invalid credentials');
        }
    }

    async logout(): Promise<{ message: string }> {
        // Lógica adicional de logout si es necesaria
        // Por ejemplo: invalidar token, registrar logout, etc.
        return {
            message: 'Admin successfully logged out',
        };
    }

    async verifyAdmin(adminEmail: string): Promise<{ email: string }> {
        const configAdminEmail = this.configService.get<string>('ADMIN_EMAIL');

        if (adminEmail !== configAdminEmail) {
            throw new UnauthorizedException('Invalid admin');
        }

        return {
            email: adminEmail,
        };
    }
}
