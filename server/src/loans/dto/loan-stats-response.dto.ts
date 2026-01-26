import { ApiProperty } from '@nestjs/swagger';

export class LoanStatsResponseDto {
    @ApiProperty({ example: 15, description: 'Total loans' })
    total: number;

    @ApiProperty({ example: 2, description: 'Active loans' })
    active: number;

    @ApiProperty({ example: 12, description: 'Returned loans' })
    returned: number;

    @ApiProperty({ example: 1, description: 'Overdue loans' })
    overdue: number;
}