import { ApiProperty } from '@nestjs/swagger';

export class ShelfComparisonStateDto {
    @ApiProperty({ example: 5.2 })
    weight: number;

    @ApiProperty({ example: 150000 })
    value: number;

    @ApiProperty({ example: 8 })
    books: number;
}