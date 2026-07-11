import { ApiProperty } from '@nestjs/swagger';
import { BestCombinationBookDto } from './best-combination-book.dto';

export class BestCombinationDto {
    @ApiProperty({ type: [BestCombinationBookDto] })
    books: BestCombinationBookDto[];

    @ApiProperty({ example: 7.8 })
    totalWeight: number;

    @ApiProperty({ example: 185000 })
    totalValue: number;
}