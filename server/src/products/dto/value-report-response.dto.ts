import { ApiProperty } from '@nestjs/swagger';

export class ValueReportResponseDto {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: 'ascending', enum: ['ascending', 'descending'] })
    sortOrder: string;

    @ApiProperty({ example: 42 })
    count: number;

    @ApiProperty({
        type: 'array',
        description: 'Products sorted by value'
    })
    products: any[];
}