import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateReservationDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Book ID to reserve'
    })
    @IsNotEmpty()
    @IsMongoId()
    bookId: string;
}