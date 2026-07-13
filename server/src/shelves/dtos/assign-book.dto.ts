import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignBookDto {
    @ApiPropertyOptional({
        example: '507f1f77bcf86cd799439011',
        description: 'Shelf ID. If omitted, the system will auto-assign to the optimal shelf using Branch & Bound.'
    })
    @IsOptional()
    @IsMongoId()
    shelfId?: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    @IsNotEmpty()
    @IsMongoId()
    bookId: string;
}