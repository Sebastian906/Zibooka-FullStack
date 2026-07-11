export class AcceptOptimizationDto {
    acceptedSuggestions: {
        productId: string;
        action: 'buy' | 'loan';
    }[];
}