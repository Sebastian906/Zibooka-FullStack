import { IsArray, IsString, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AcceptSuggestionDto {
    @IsString()
    productId: string;
    @IsIn(['buy', 'loan'])
    action: 'buy' | 'loan';
}

export class AcceptOptimizationDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AcceptSuggestionDto)
    acceptedSuggestions: AcceptSuggestionDto[];
}