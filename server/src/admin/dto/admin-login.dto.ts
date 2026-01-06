import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
    @ApiProperty({
        example: 'admin@zibooka.com',
        description: 'Admin email'
    })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({
        example: 'adminPassword123',
        description: 'Admin password'
    })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiProperty({
        example: '+1234567890',
        description: 'Admin phone number'
    })
    @IsNotEmpty()
    @IsString()
    phone: string;
}