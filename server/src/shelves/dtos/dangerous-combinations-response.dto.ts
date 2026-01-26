import { ApiProperty } from '@nestjs/swagger';

export class DangerousCombinationDto {
    @ApiProperty()
    books: any[];

    @ApiProperty({ example: 9.5 })
    totalWeight: number;

    @ApiProperty({ example: 'A1' })
    shelfCode: string;
}

export class DangerousCombinationsResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 5 })
    count: number;

    @ApiProperty({ type: [DangerousCombinationDto] })
    combinations: DangerousCombinationDto[];
}