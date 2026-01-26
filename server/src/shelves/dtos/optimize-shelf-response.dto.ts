import { ApiProperty } from '@nestjs/swagger';

export class OptimizeShelfResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty()
    bestCombination: {
        books: any[];
        totalWeight: number;
        totalValue: number;
    };

    @ApiProperty({ example: 8 })
    maxWeight: number;
}