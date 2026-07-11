import { ApiProperty } from '@nestjs/swagger';
import { AlgorithmStatsDto } from './algorithm-stats.dto';

export class OptimizeShelfResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({
        description: 'Best book combination found by Branch & Bound algorithm',
        properties: {
            books: {
                type: 'array',
                description: 'Selected books with details',
                items: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                        name: { type: 'string', example: 'Don Quijote de la Mancha' },
                        category: { type: 'string', example: 'Fiction' },
                        pageCount: { type: 'number', example: 863 },
                        offerPrice: { type: 'number', example: 45000 },
                        weight: { type: 'string', example: '4.32' },
                    }
                }
            },
            totalWeight: { type: 'number', example: 7.8 },
            totalValue: { type: 'number', example: 185000 },
        }
    })
    bestCombination: {
        books: any[];
        totalWeight: number;
        totalValue: number;
    };

    @ApiProperty({ description: 'Maximum weight capacity of the shelf', example: 8 })
    maxWeight: number;

    @ApiProperty({
        description: 'Recommendation message',
        example: 'Consider reorganizing: You could increase value by 23.5% by adjusting book selection.'
    })
    recommendation: string;

    @ApiProperty({
        description: 'Comparison between current and optimal state (only when analyzeAll=false)',
        required: false,
        properties: {
            current: {
                type: 'object',
                properties: {
                    weight: { type: 'number', example: 5.2 },
                    value: { type: 'number', example: 150000 },
                    books: { type: 'number', example: 8 },
                }
            },
            optimal: {
                type: 'object',
                properties: {
                    weight: { type: 'number', example: 7.8 },
                    value: { type: 'number', example: 185000 },
                    books: { type: 'number', example: 12 },
                }
            },
            improvement: { type: 'string', example: '23.5%' },
        }
    })
    currentVsOptimal?: {
        current: { weight: number; value: number; books: number };
        optimal: { weight: number; value: number; books: number };
        improvement: string;
    };

    @ApiProperty({
        description: 'Branch & Bound algorithm performance statistics',
        required: false,
        type: AlgorithmStatsDto
    })
    algorithmStats?: AlgorithmStatsDto;
}