import { ApiProperty } from '@nestjs/swagger';

export class BestCombinationBookDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    _id: string;

    @ApiProperty({ example: 'Don Quijote de la Mancha' })
    name: string;

    @ApiProperty({ example: 'Fiction' })
    category: string;

    @ApiProperty({ example: 863 })
    pageCount: number;

    @ApiProperty({ example: 45000 })
    offerPrice: number;

    @ApiProperty({ example: '4.32' })
    weight: string;
}