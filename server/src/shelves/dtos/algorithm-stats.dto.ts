import { ApiProperty } from '@nestjs/swagger';

export class AlgorithmStatsDto {
    @ApiProperty({ description: 'Total nodes explored during Branch & Bound', example: 847 })
    nodesExplored: number;

    @ApiProperty({ description: 'Nodes pruned by upper bound', example: 712 })
    nodesPruned: number;

    @ApiProperty({ description: 'Percentage of nodes pruned', example: 84 })
    prunedPercentage: number;

    @ApiProperty({ description: 'Execution time in milliseconds', example: 12 })
    elapsedMs: number;

    @ApiProperty({ description: 'Whether fractional upper bound was used', example: true })
    upperBoundUsed: boolean;
}