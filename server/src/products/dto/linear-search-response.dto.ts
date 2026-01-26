import { ApiProperty } from '@nestjs/swagger';

export class LinearSearchResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 'Harry' })
    searchTerm: string;

    @ApiProperty({ example: 'title', enum: ['title', 'author'] })
    searchBy: string;

    @ApiProperty({ example: 3 })
    count: number;

    @ApiProperty({
        type: 'array',
        description: 'Array of products matching the search'
    })
    results: any[];
}