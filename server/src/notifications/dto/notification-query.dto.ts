import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class NotificationQueryDto extends PaginationDto {
    @ApiPropertyOptional({
        description: 'Filter by notification type',
        enum: ['loan_reminder', 'reservation_reminder', 'manual'],
    })
    @IsOptional()
    @IsEnum(['loan_reminder', 'reservation_reminder', 'manual'])
    type?: string;

    @ApiPropertyOptional({
        description: 'Filter by user ID',
        example: '507f1f77bcf86cd799439011',
    })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: ['sent', 'failed', 'pending'],
    })
    @IsOptional()
    @IsEnum(['sent', 'failed', 'pending'])
    status?: string;
}
