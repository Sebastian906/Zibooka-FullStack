import { ApiProperty } from '@nestjs/swagger';

export class BinarySearchResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: '978-0-306-40615-7' })
    isbn: string;

    @ApiProperty({ example: true })
    found: boolean;

    @ApiProperty({
        type: 'object',
        description: 'Product found (null if not found)',
        nullable: true,
        additionalProperties: true
    })
    product: any;
}