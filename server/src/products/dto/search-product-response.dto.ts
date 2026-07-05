import { ApiProperty } from '@nestjs/swagger';

export class SearchProductResponseDto {
    @ApiProperty({ example: true })
    success!: boolean;

    @ApiProperty({ example: 'Harry Potter', description: 'Original term of search' })
    query!: string;

    @ApiProperty({ example: 'text', enum: ['isbn', 'text'], description: 'Detected type of search' })
    searchType!: 'isbn' | 'text';

    @ApiProperty({ example: 3, description: 'Quantity of results found' })
    count!: number;

    @ApiProperty({
        type: 'array',
        description: 'Found products (empty array if no results found)',
    })
    products!: any[];
}