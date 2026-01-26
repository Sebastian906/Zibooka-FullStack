import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CancelReservationDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Reservation ID to cancel'
    })
    @IsNotEmpty()
    @IsMongoId()
    reservationId: string;
}