import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CartOptimizationService } from './cart-optimization.service';
import { UserDocument } from '../../users/schemas/user.schema';
import { ProductDocument } from '../../products/schemas/product.schema';
import { ReservationDocument } from '../../reservations/schemas/reservation.schema';
import { ReservationService } from '../../reservations/reservation.service';

describe('CartOptimizationService', () => {
    let service: CartOptimizationService;
    let userModel: jest.Mocked<Model<UserDocument>>;
    let productModel: jest.Mocked<Model<ProductDocument>>;
    let reservationService: jest.Mocked<ReservationService>;

    // ─── Mock Data (IDs válidos de 24 hex chars) ─────────────

    const PROD1 = 'aabbccddeeff001122334401';
    const PROD2 = 'aabbccddeeff001122334402';
    const PROD3 = 'aabbccddeeff001122334403';
    const PROD4 = 'aabbccddeeff001122334404';
    const PROD5 = 'aabbccddeeff001122334405';
    const PROD6 = 'aabbccddeeff001122334406';
    const USER_ID = 'aabbccddeeff001122334499';

    const mockUser = {
        _id: USER_ID,
        cartData: {
            [PROD1]: 1,
            [PROD2]: 2,
            [PROD3]: 1,
        },
    };

    const mockProducts = [
        {
            _id: { toString: () => PROD1 },
            name: 'Libro Caro 1',
            price: 50,
            offerPrice: 40,
            loanStock: 1,
            loanFee: 5,
        },
        {
            _id: { toString: () => PROD2 },
            name: 'Libro Barato',
            price: 3,
            offerPrice: 3,
            loanStock: 1,
            loanFee: 5,
        },
        {
            _id: { toString: () => PROD3 },
            name: 'Libro Sin Stock',
            price: 30,
            offerPrice: 25,
            loanStock: 0,
            loanFee: 5,
        },
    ];

    const mockReservation = {
        _id: { toString: () => 'aabbccddeeff001122334490' },
        userId: USER_ID,
        bookId: PROD1,
        status: 'pending',
    };

    // ─── Setup ────────────────────────────────────────────────

    beforeEach(async () => {
        const mockUserModel = {
            findById: jest.fn(),
        };

        const mockProductModel = {
            find: jest.fn(),
        };

        const mockReservationModel = {};

        const mockReservationService = {
            addToWaitingList: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CartOptimizationService,
                { provide: getModelToken('User'), useValue: mockUserModel },
                { provide: getModelToken('Product'), useValue: mockProductModel },
                { provide: getModelToken('Reservation'), useValue: mockReservationModel },
                { provide: ReservationService, useValue: mockReservationService },
            ],
        }).compile();

        service = module.get<CartOptimizationService>(CartOptimizationService);
        userModel = module.get(getModelToken('User'));
        productModel = module.get(getModelToken('Product'));
        reservationService = module.get(ReservationService);
    });

    // ─── Tests: optimizeCart ──────────────────────────────────

    describe('optimizeCart', () => {

        it('debe retornar respuesta vacía si el usuario no tiene carrito', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            expect(result.suggestions).toHaveLength(0);
            expect(result.totalIfAllBuy).toBe(0);
            expect(result.totalOptimized).toBe(0);
            expect(result.estimatedSavings).toBe(0);
            expect(result.loanFeeEstimate).toBe(0);
        });

        it('debe retornar respuesta vacía si el carrito está vacío', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ cartData: {} }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            expect(result.suggestions).toHaveLength(0);
            expect(result.totalIfAllBuy).toBe(0);
        });

        it('debe sugerir "loan" para libros con loanStock > 0 y loanFee < price', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // PROD1: price=40, loanFee=5, loanStock=1 → loan
            const prod1Suggestion = result.suggestions.find(s => s.productId === PROD1);
            expect(prod1Suggestion.suggestion).toBe('loan');
            expect(prod1Suggestion.loanFee).toBe(5);
        });

        it('debe sugerir "buy" para libros con loanStock = 0', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // PROD3: loanStock=0 → buy
            const prod3Suggestion = result.suggestions.find(s => s.productId === PROD3);
            expect(prod3Suggestion.suggestion).toBe('buy');
            expect(prod3Suggestion.loanFee).toBeUndefined();
        });

        it('debe sugerir "buy" para libros con loanFee >= price', async () => {
            const productsWithExpensiveFee = [
                {
                    _id: { toString: () => PROD4 },
                    name: 'Libro Fee Alto',
                    price: 4,
                    offerPrice: 4,
                    loanStock: 1,
                    loanFee: 5, // fee > price
                },
            ];

            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ cartData: { [PROD4]: 1 } }),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(productsWithExpensiveFee),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            expect(result.suggestions[0].suggestion).toBe('buy');
        });

        it('debe calcular totalIfAllBuy correctamente', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // PROD1: 40 * 1 = 40
            // PROD2: 3 * 2 = 6
            // PROD3: 25 * 1 = 25
            // Total = 71
            expect(result.totalIfAllBuy).toBe(71);
        });

        it('debe calcular ahorro positivo cuando hay préstamos sugeridos', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            expect(result.estimatedSavings).toBeGreaterThan(0);
            expect(result.totalOptimized).toBeLessThan(result.totalIfAllBuy);
        });

        it('debe calcular loanFeeEstimate como la suma de fees de préstamos', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // PROD1: loanFee=5 * qty=1 = 5
            // PROD2: loanFee=5 pero price=3 < loanFee=5 → buy (no loan)
            // PROD3: loanStock=0 → buy
            // loanFeeEstimate total = 5
            expect(result.loanFeeEstimate).toBe(5);
        });

        it('debe ordenar por ahorro potencial descendente (greedy)', async () => {
            const products = [
                {
                    _id: { toString: () => PROD5 },
                    name: 'Ahorro bajo',
                    price: 10,
                    offerPrice: 10,
                    loanStock: 1,
                    loanFee: 8, // ahorro = 2
                },
                {
                    _id: { toString: () => PROD6 },
                    name: 'Ahorro alto',
                    price: 100,
                    offerPrice: 100,
                    loanStock: 1,
                    loanFee: 5, // ahorro = 95
                },
            ];

            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue({ cartData: { [PROD5]: 1, [PROD6]: 1 } }),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(products),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // El de mayor ahorro (PROD6) debe aparecer primero
            expect(result.suggestions[0].productId).toBe(PROD6);
            expect(result.suggestions[1].productId).toBe(PROD5);
        });

        it('debe manejar quantities mayores a 1', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            // PROD2 tiene quantity=2
            const prod2 = result.suggestions.find(s => s.productId === PROD2);
            expect(prod2.quantity).toBe(2);
        });

        it('debe retornar estimatedCost en cada sugerencia', async () => {
            userModel.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            } as any);

            productModel.find.mockReturnValue({
                lean: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockProducts),
                }),
            } as any);

            const result = await service.optimizeCart(USER_ID);

            result.suggestions.forEach(s => {
                expect(s.estimatedCost).toBeDefined();
                expect(typeof s.estimatedCost).toBe('number');
                expect(s.estimatedCost).toBeGreaterThanOrEqual(0);
            });
        });

        it('debe manejar errores del DB retornando respuesta vacía', async () => {
            userModel.findById.mockImplementation(() => {
                throw new Error('DB connection failed');
            });

            const result = await service.optimizeCart(USER_ID);

            expect(result.suggestions).toHaveLength(0);
            expect(result.totalIfAllBuy).toBe(0);
        });
    });

    // ─── Tests: acceptOptimization ────────────────────────────

    describe('acceptOptimization', () => {

        it('debe crear reservas para items marcados como "loan"', async () => {
            reservationService.addToWaitingList.mockResolvedValue(mockReservation as any);

            const result = await service.acceptOptimization(USER_ID, [
                { productId: PROD1, action: 'loan' },
            ]);

            expect(result.reservations).toContain('aabbccddeeff001122334490');
            expect(reservationService.addToWaitingList).toHaveBeenCalledWith(USER_ID, PROD1);
        });

        it('debe retornar lista de purchases para items marcados como "buy"', async () => {
            const result = await service.acceptOptimization(USER_ID, [
                { productId: PROD1, action: 'buy' },
            ]);

            expect(result.purchases).toContain(PROD1);
            expect(result.reservations).toHaveLength(0);
        });

        it('debe manejar mix de compras y préstamos', async () => {
            reservationService.addToWaitingList.mockResolvedValue(mockReservation as any);

            const result = await service.acceptOptimization(USER_ID, [
                { productId: PROD1, action: 'loan' },
                { productId: PROD2, action: 'buy' },
                { productId: PROD3, action: 'loan' },
            ]);

            expect(result.reservations).toHaveLength(2);
            expect(result.purchases).toHaveLength(1);
            expect(result.purchases).toContain(PROD2);
        });

        it('debe manejar errores de reserva sin fallar整个', async () => {
            reservationService.addToWaitingList.mockRejectedValue(
                new Error('Book not available')
            );

            const result = await service.acceptOptimization(USER_ID, [
                { productId: PROD1, action: 'loan' },
                { productId: PROD2, action: 'buy' },
            ]);

            // La reserva falló, pero la compra se procesa
            expect(result.reservations).toHaveLength(0);
            expect(result.purchases).toContain(PROD2);
        });

        it('debe retornar arrays vacíos si no hay sugerencias', async () => {
            const result = await service.acceptOptimization(USER_ID, []);

            expect(result.reservations).toHaveLength(0);
            expect(result.purchases).toHaveLength(0);
        });
    });
});
