import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LinearSearchDto {
    @ApiProperty({
        example: 'Harry Potter',
        description: 'Term to search for'
    })
    @IsNotEmpty()
    @IsString()
    searchTerm: string;

    @ApiProperty({
        example: 'title',
        enum: ['title', 'author'],
        description: 'Field to search in',
        required: false,
        default: 'title'
    })
    @IsOptional()
    @IsIn(['title', 'author'])
    searchBy?: 'title' | 'author';
}