import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class UpdateOrderStatusDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Order ID',
    })
    @IsNotEmpty()
    @IsMongoId()
    orderId: string;

    @ApiProperty({
        example: 'Shipped',
        description: 'Order status',
    })
    @IsNotEmpty()
    @IsString()
    status: string;
}