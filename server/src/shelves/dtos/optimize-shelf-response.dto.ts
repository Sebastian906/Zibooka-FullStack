import { ApiProperty } from '@nestjs/swagger';
import { AlgorithmStatsDto } from './algorithm-stats.dto';
import { BestCombinationDto } from './best-combination.dto';
import { ShelfComparisonStateDto } from './shelf-comparison-state.dto';

export class OptimizeShelfResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ description: 'Best book combination found by Branch & Bound algorithm', type: BestCombinationDto })
    bestCombination: BestCombinationDto;

    @ApiProperty({ description: 'Maximum weight capacity of the shelf', example: 8 })
    maxWeight: number;

    @ApiProperty({
        description: 'Recommendation message',
        example: 'Consider reorganizing: You could increase value by 23.5% by adjusting book selection.'
    })
    recommendation: string;

    @ApiProperty({ description: 'Current shelf state (only when analyzeAll=false)', type: ShelfComparisonStateDto })
    current?: ShelfComparisonStateDto;

    @ApiProperty({ description: 'Optimal shelf state', type: ShelfComparisonStateDto })
    optimal?: ShelfComparisonStateDto;

    @ApiProperty({ example: '23.5%' })
    improvement?: string;

    @ApiProperty({ description: 'Branch & Bound algorithm performance statistics', type: AlgorithmStatsDto })
    algorithmStats?: AlgorithmStatsDto;
}