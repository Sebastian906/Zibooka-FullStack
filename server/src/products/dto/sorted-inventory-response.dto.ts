import { ApiProperty } from '@nestjs/swagger';

export class SortedInventoryResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 42 })
    count: number;

    @ApiProperty({
        type: 'array',
        description: 'Products sorted by ISBN (ascending)'
    })
    products: any[];
}