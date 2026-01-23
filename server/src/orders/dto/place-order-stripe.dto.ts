import { ApiProperty } from "@nestjs/swagger";
import { OrderItemDto } from "./order-item.dto";
import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class PlaceOrderStripeDto {
    @ApiProperty({
        description: 'Array of order items',
        type: [OrderItemDto]
    })
    @IsArray()
    @ArrayMinSize(1, { message: 'Please add at least one product' })
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiProperty({
        description: 'Address ID',
        example: '507f1f77bcf86cd799439011'
    })
    @IsNotEmpty()
    @IsMongoId()
    address: string;
}