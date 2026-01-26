import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ReturnLoanDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Loan ID to return',
        required: false
    })
    @IsOptional()
    @IsMongoId()
    loanId?: string;

    @ApiProperty({
        example: 'Book returned in good condition',
        description: 'Optional notes about the return',
        required: false
    })
    @IsOptional()
    @IsString()
    notes?: string;
}