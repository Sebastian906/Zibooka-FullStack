import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendNotificationDto {
    @ApiProperty({
        description: 'ID of the user who will receive the notification',
        example: '507f1f77bcf86cd799439011',
    })
    @IsNotEmpty()
    @IsString()
    recipientId: string;

    @ApiProperty({
        description: 'Email subject',
        example: 'Recordatorio de préstamo - Zibooka',
    })
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiPropertyOptional({
        description: 'Custom message body (optional, used for manual notifications)',
        example: 'Por favor devuelva el libro antes del viernes.',
    })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional({
        description: 'ID of the related Loan or Reservation (optional for manual notifications)',
        example: '507f1f77bcf86cd799439011',
    })
    @IsOptional()
    @IsString()
    relatedId?: string;

    @ApiPropertyOptional({
        description: 'Type of the related entity (optional for manual notifications)',
        enum: ['Loan', 'Reservation'],
        example: 'Loan',
    })
    @IsOptional()
    @IsEnum(['Loan', 'Reservation'])
    relatedModel?: 'Loan' | 'Reservation';
}
