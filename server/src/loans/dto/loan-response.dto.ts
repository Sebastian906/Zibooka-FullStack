import { ApiProperty } from '@nestjs/swagger';

export class LoanResponseDto {
    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    _id: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    userId: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    bookId: string;

    @ApiProperty({ example: '2025-01-20T10:00:00.000Z' })
    loanDate: Date;

    @ApiProperty({ example: '2025-02-04T10:00:00.000Z' })
    dueDate: Date;

    @ApiProperty({
        example: null,
        nullable: true,
        description: 'Return date (null if not returned)'
    })
    returnDate: Date | null;

    @ApiProperty({
        example: 'active',
        enum: ['active', 'returned', 'overdue']
    })
    status: string;

    @ApiProperty({ example: 0, description: 'Late fee in USD' })
    lateFee: number;

    @ApiProperty({
        example: 'User requested extension',
        required: false
    })
    notes?: string;
}