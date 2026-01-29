import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Password reset token from email'
    })
    @IsNotEmpty()
    @IsString()
    token: string;

    @ApiProperty({
        example: 'newPassword123',
        description: 'New password (min 8 characters)',
        minLength: 8
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    newPassword: string;

    @ApiProperty({
        example: 'newPassword123',
        description: 'Confirm new password',
        minLength: 8
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    confirmPassword: string;
}