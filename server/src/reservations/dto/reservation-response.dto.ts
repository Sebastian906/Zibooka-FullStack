import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    _id: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    userId: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    bookId: string;

    @ApiProperty({ example: '2025-01-20T10:00:00.000Z' })
    requestDate: Date;

    @ApiProperty({
        example: 'pending',
        enum: ['pending', 'fulfilled', 'cancelled', 'expired']
    })
    status: string;

    @ApiProperty({
        example: 1,
        description: 'Position in queue (1 = first)'
    })
    priority: number;

    @ApiProperty({
        example: null,
        nullable: true,
        description: 'When user was notified'
    })
    notifiedAt: Date | null;

    @ApiProperty({
        example: null,
        nullable: true,
        description: 'When reservation was fulfilled'
    })
    fulfilledAt: Date | null;

    @ApiProperty({
        example: '2025-02-19T10:00:00.000Z',
        description: 'Reservation expiration date'
    })
    expiresAt: Date;

    @ApiProperty({
        example: 'User needs book for thesis',
        required: false
    })
    notes?: string;
}