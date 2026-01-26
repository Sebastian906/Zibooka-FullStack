import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BinarySearchDto {
    @ApiProperty({
        example: '978-0-306-40615-7',
        description: 'ISBN-13 to search for (format: 978-X-XXXX-XXXXX-X)'
    })
    @IsNotEmpty()
    @IsString()
    @Matches(/^978-\d-\d{4}-\d{5}-\d$/, {
        message: 'ISBN must be in format: 978-X-XXXX-XXXXX-X'
    })
    isbn: string;
}