import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateShelfDto {
    @ApiProperty({ example: 'A1', description: 'Shelf code' })
    @IsNotEmpty()
    @IsString()
    code: string;

    @ApiProperty({ example: 8, description: 'Maximum weight in Kg', default: 8 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(20)
    maxWeight?: number;

    @ApiProperty({ example: 'Section A, Floor 1', description: 'Physical location' })
    @IsNotEmpty()
    @IsString()
    location: string;

    @ApiProperty({ example: 'Fiction section', required: false })
    @IsOptional()
    @IsString()
    description?: string;
}