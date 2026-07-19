import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class TranslateProductDto {
    @ApiProperty({
        description: 'Target language code',
        example: 'es',
        enum: ['es', 'en'],
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['es', 'en'])
    toLanguage: string;
}