import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'User email to send password reset link'
    })
    @IsNotEmpty()
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;
}