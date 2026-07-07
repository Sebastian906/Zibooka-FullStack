import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';

export class DemandListRequestDto {
    @ApiPropertyOptional({ default: 30, description: 'Days ahead to predict (1-90)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(90)
    days_ahead?: number = 30;

    @ApiPropertyOptional({ default: 20, description: 'Max books to return (1-100)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ default: 0.3, description: 'Minimum demand score (0-1)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    min_score?: number = 0.3;
}