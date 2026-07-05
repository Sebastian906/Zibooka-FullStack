import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchProductDto {
    @ApiProperty({
        description: 'Search term (ISBN, author or text)',
        example: 'Harry Potter'
    })
    @IsString()
    query!: string;

    @ApiProperty({
        description: 'Results limit (only for text searches)',
        required: false,
        default: 20,
        example: 20
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}