import { ApiProperty } from '@nestjs/swagger';
import { ReservationResponseDto } from './reservation-response.dto';

export class WaitingListResponseDto {
    @ApiProperty({ example: 5 })
    count: number;

    @ApiProperty({
        type: [ReservationResponseDto],
        description: 'List of reservations in FIFO order'
    })
    waitingList: ReservationResponseDto[];
}