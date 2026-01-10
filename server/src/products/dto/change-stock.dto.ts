import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsNotEmpty } from 'class-validator';

export class ChangeStockDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Product ID',
    })
    @IsNotEmpty()
    @IsMongoId()
    productId: string;

    @ApiProperty({ example: true, description: 'Stock status' })
    @IsNotEmpty()
    @IsBoolean()
    inStock: boolean;
}