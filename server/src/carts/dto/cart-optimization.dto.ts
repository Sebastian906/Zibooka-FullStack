import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, ValidateNested, Min, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemSuggestion {
    @ApiProperty()
    @IsString()
    productId: string;

    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    quantity: number;

    @ApiProperty({ enum: ['buy', 'loan'] })
    @IsIn(['buy', 'loan'])
    suggestion: 'buy' | 'loan';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    loanFee?: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    estimatedCost: number;
}

export class CartOptimizationResponse {
    @ApiProperty({ type: [CartItemSuggestion] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemSuggestion)
    suggestions: CartItemSuggestion[];

    @ApiProperty()
    @IsNumber()
    totalIfAllBuy: number;

    @ApiProperty()
    @IsNumber()
    totalOptimized: number;

    @ApiProperty()
    @IsNumber()
    estimatedSavings: number;

    @ApiProperty()
    @IsNumber()
    loanFeeEstimate: number;
}