import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SingleProductDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Product ID',
    })
    @IsNotEmpty()
    @IsMongoId()
    productId: string;
}