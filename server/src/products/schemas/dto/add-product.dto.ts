import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AddProductDto {
    @ApiProperty({ example: 'Product Name', description: 'Name of the product' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({
        example: 'Product description',
        description: 'Description of the product',
    })
    @IsNotEmpty()
    @IsString()
    description: string;

    @ApiProperty({ example: 100, description: 'Price of the product' })
    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    price: number;

    @ApiProperty({ example: 80, description: 'Offer price of the product' })
    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    offerPrice: number;

    @ApiProperty({ example: 'Electronics', description: 'Category of the product' })
    @IsNotEmpty()
    @IsString()
    category: string;

    @ApiProperty({
        example: false,
        description: 'Is this a popular product',
        required: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    popular?: boolean;

    @ApiProperty({
        example: true,
        description: 'Is the product in stock',
        required: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    inStock?: boolean;
}