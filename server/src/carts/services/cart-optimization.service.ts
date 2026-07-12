import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Product, ProductDocument } from '../../products/schemas/product.schema';
import {
    CartOptimizationResponse,
    CartItemSuggestion
} from '../dto/cart-optimization.dto';
import { Reservation, ReservationDocument } from 'src/reservations/schemas/reservation.schema';
import { ReservationService } from 'src/reservations/reservation.service';

@Injectable()
export class CartOptimizationService {
    private readonly logger = new Logger(CartOptimizationService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(Reservation.name) private reservationModel: Model<ReservationDocument>,
        private reservationService: ReservationService,
    ) { }

    /**
     * Optimiza el carrito usando algoritmo greedy.
     * 
     * Complejidad: O(n log n) por la ordenación.
     * 
     * Lógica:
     * 1. Obtener items del carrito con datos del producto (incluyendo loanFee)
     * 2. Ordenar items por "ahorro potencial" descendente (price - loanFee)
     * 3. Para cada item:
     *    - Si loanStock > 0 Y loanFee < price → candidato a préstamo
     *    - Sino → comprar
     * 4. Calcular ahorro total
     */
    async optimizeCart(userId: string): Promise<CartOptimizationResponse> {
        try {
            const user = await this.userModel.findById(userId).lean();
            if (!user?.cartData || Object.keys(user.cartData).length === 0) {
                return this.emptyResponse();
            }

            const productIds = Object.keys(user.cartData);
            const products = await this.productModel
                .find({ _id: { $in: productIds.map(id => new Types.ObjectId(id)) } })
                .lean()
                .exec();

            const productMap = new Map(
                products.map(p => [p._id.toString(), p])
            );

            const cartItems = productIds
                .filter(id => productMap.has(id))
                .map(id => {
                    const product = productMap.get(id)!;
                    const effectivePrice = product.offerPrice ?? product.price;
                    const loanFee = product.loanFee ?? 5.00;

                    return {
                        productId: id,
                        title: product.name,
                        price: effectivePrice,
                        quantity: user.cartData[id] ?? 1,
                        loanStock: product.loanStock || 0,
                        loanFee: loanFee,
                        // Ahorro potencial por unidad = price - loanFee
                        potentialSavingPerUnit: effectivePrice - loanFee,
                    };
                });

            if (cartItems.length === 0) {
                return this.emptyResponse();
            }

            // Greedy: ordenar por ahorro potencial descendente
            // Los libros donde más se ahorra van primero
            const sortedItems = [...cartItems].sort(
                (a, b) => b.potentialSavingPerUnit - a.potentialSavingPerUnit
            );

            const suggestions: CartItemSuggestion[] = [];
            let totalBuy = 0;
            let totalLoan = 0;
            let totalAllBuy = 0;

            for (const item of sortedItems) {
                const itemTotal = item.price * item.quantity;
                totalAllBuy += itemTotal;

                // Greedy: préstamo si hay stock Y el fee es menor al precio
                if (item.loanStock > 0 && item.loanFee < item.price) {
                    suggestions.push({
                        productId: item.productId,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity,
                        suggestion: 'loan',
                        loanFee: item.loanFee,
                        estimatedCost: item.loanFee * item.quantity,
                    });
                    totalLoan += item.loanFee * item.quantity;
                } else {
                    suggestions.push({
                        productId: item.productId,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity,
                        suggestion: 'buy',
                        estimatedCost: itemTotal,
                    });
                    totalBuy += itemTotal;
                }
            }

            return {
                suggestions,
                totalIfAllBuy: this.round(totalAllBuy),
                totalOptimized: this.round(totalBuy + totalLoan),
                estimatedSavings: this.round(totalAllBuy - totalBuy - totalLoan),
                loanFeeEstimate: this.round(totalLoan),
            };
        } catch (error: any) {
            this.logger.error(`Cart optimization failed: ${error.message}`, error.stack);
            return this.emptyResponse();
        }
    }

    /**
     * Acepta la optimización y crea las reservas correspondientes.
     */
    async acceptOptimization(
        userId: string,
        acceptedSuggestions: { productId: string; action: 'buy' | 'loan' }[]
    ): Promise<{ reservations: string[]; purchases: string[] }> {
        const reservations: string[] = [];
        const purchases: string[] = [];

        for (const suggestion of acceptedSuggestions) {
            if (suggestion.action === 'loan') {
                try {
                    // addToWaitingList(userId, bookId) — firma real del ReservationService
                    const reservation = await this.reservationService.addToWaitingList(
                        userId,
                        suggestion.productId,
                    );
                    reservations.push(reservation._id.toString());
                } catch (error: any) {
                    this.logger.warn(
                        `Failed to create reservation for product ${suggestion.productId}: ${error.message}`
                    );
                }
            } else if (suggestion.action === 'buy') {
                purchases.push(suggestion.productId);
            }
        }

        return { reservations, purchases };
    }

    private emptyResponse(): CartOptimizationResponse {
        return {
            suggestions: [],
            totalIfAllBuy: 0,
            totalOptimized: 0,
            estimatedSavings: 0,
            loanFeeEstimate: 0,
        };
    }

    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }
}