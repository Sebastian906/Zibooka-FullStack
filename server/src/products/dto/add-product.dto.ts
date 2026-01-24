import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AddProductDto {
    @ApiProperty({
        example: '978-0-306-40615-7',
        description: 'ISBN-13 of the book',
        required: false,
    })
    @IsOptional()
    @IsString()
    isbn?: string;

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

    @ApiProperty({
        example: 'J.K. Rowling',
        description: 'Author of the book',
        required: false,
    })
    @IsOptional()
    @IsString()
    author?: string;

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

    @ApiProperty({
        example: 350,
        description: 'Number of pages',
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5000)
    pageCount?: number;

    @ApiProperty({
        example: 'Penguin Books',
        description: 'Publisher name',
        required: false,
    })
    @IsOptional()
    @IsString()
    publisher?: string;

    @ApiProperty({
        example: 2023,
        description: 'Year of publication',
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1800)
    @Max(new Date().getFullYear())
    publicationYear?: number;

    @ApiProperty({ example: 'Electronics', description: 'Category of the product' })
    @IsNotEmpty()
    @IsString()
    category: string;

    @ApiProperty({
        example: false,
        description: 'Is this a popular product',
        required: false,
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return false; // Por defecto false
    })
    @IsBoolean()
    popular?: boolean = false; // Valor por defecto

    @ApiProperty({
        example: true,
        description: 'Is the product in stock',
        required: false,
        default: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return true; // Por defecto true
    })
    @IsBoolean()
    inStock?: boolean = true;
}