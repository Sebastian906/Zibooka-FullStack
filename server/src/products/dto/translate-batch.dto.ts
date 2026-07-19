import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsString, ArrayMinSize } from 'class-validator';

export class TranslateBatchDto {
    @ApiProperty({
        description: 'Array of product IDs to translate',
        example: ['abc123', 'def456'],
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    productIds: string[];

    @ApiProperty({
        description: 'Target language code',
        example: 'es',
        enum: ['es', 'en'],
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['es', 'en'])
    toLanguage: string;
}