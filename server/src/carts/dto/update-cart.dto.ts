import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty, IsNumber, Min } from "class-validator";

export class UpdateCartDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Product ID',
    })
    @IsNotEmpty()
    @IsMongoId()
    itemId: string;

    @ApiProperty({
        example: 3,
        description: 'Quantity of the product',
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    quantity: number;
}