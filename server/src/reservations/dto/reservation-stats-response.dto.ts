import { ApiProperty } from '@nestjs/swagger';

export class ReservationStatsResponseDto {
    @ApiProperty({ example: 10, description: 'Total reservations' })
    total: number;

    @ApiProperty({ example: 3, description: 'Pending reservations' })
    pending: number;

    @ApiProperty({ example: 5, description: 'Fulfilled reservations' })
    fulfilled: number;

    @ApiProperty({ example: 1, description: 'Cancelled reservations' })
    cancelled: number;

    @ApiProperty({ example: 1, description: 'Expired reservations' })
    expired: number;
}