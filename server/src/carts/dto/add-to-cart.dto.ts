import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsNotEmpty } from "class-validator";

export class AddToCartDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'Product ID to add to cart',
    })
    @IsNotEmpty()
    @IsMongoId()
    itemId: string;
}