import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class UserLoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email' })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({ example: 'password123', description: 'User password' })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiProperty({ example: '+1234567890', description: 'User phone number' })
    @IsNotEmpty()
    @IsString()
    phone: string;
}