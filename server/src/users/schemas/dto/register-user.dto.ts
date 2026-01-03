import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterUserDto {
    @ApiProperty({ example: "John Doe", description: "User full name" })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({ example: 'password123', description: 'User password', minLength: 8 })
    @IsNotEmpty()
    @IsString()
    @MinLength(8, { message: 'Please enter a strong password' })
    password: string;

    @ApiProperty({ example: '+1234567890', description: 'User phone number' })
    @IsNotEmpty()
    @IsString()
    phone: string;
}