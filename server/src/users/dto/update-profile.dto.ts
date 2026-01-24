import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
    @ApiProperty({
        example: 'John Doe',
        description: 'User full name',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({
        example: 'user@example.com',
        description: 'User email',
        required: true
    })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({
        example: '+1234567890',
        description: 'User phone number',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({
        example: 'currentPassword123',
        description: 'Current password (required only if changing password)',
        required: false
    })
    @IsOptional()
    @IsString()
    currentPassword?: string;

    @ApiProperty({
        example: 'newPassword123',
        description: 'New password (min 8 characters)',
        required: false,
        minLength: 8
    })
    @IsOptional()
    @IsString()
    @MinLength(8, { message: 'New password must be at least 8 characters' })
    newPassword?: string;
}