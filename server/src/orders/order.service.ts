import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { PlaceOrderCODDto } from './dto/place-order-cod.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PlaceOrderStripeDto } from './dto/place-order-stripe.dto';
import { OrderSchedulerService } from './services/order-scheduler.service';
import { PaginatedResult, PaginationDto } from 'src/common/dto/pagination.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class OrderService {

    // Global variables for payment
    private readonly currency = 'usd';
    private readonly deliveryCharges = 10; // 10 Dollars
    private readonly taxPercentage = 0.02; // 2% tax
    private stripe: Stripe;

    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
        private readonly orderScheduler: OrderSchedulerService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        // Initialize Stripe
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not defined');
        }
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2026-02-25.clover',
        });
    }

    async placeOrderCOD(
        userId: string,
        placeOrderDto: PlaceOrderCODDto,
    ): Promise<{ message: string }> {
        try {
            const { items, address } = placeOrderDto;

            if (items.length === 0) {
                throw new Error('Please add product first');
            }

            // Calculate amount using items
            let subtotal = 0;
            for (const item of items) {
                const product = await this.productModel.findById(item.product);
                if (!product) {
                    throw new NotFoundException(
                        `Product with ID ${item.product} not found`,
                    );
                }
                subtotal += product.offerPrice * item.quantity;
            }

            // Calculate total amount
            const taxAmount = subtotal * this.taxPercentage;
            const totalAmount = subtotal + taxAmount + this.deliveryCharges;

            // Create order
            const newOrder = await this.orderModel.create({
                userId,
                items: items.map(item => ({
                    product: new Types.ObjectId(item.product),
                    quantity: item.quantity,
                })),
                amount: totalAmount,
                address,
                paymentMethod: 'COD',
            });

            // Enqueue order in priority queue
            await this.orderScheduler.enqueueOrder(newOrder._id.toString());

            // Clear user cart
            await this.userModel.findByIdAndUpdate(userId, { cartData: {} });

            return { message: 'Order Placed' };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async placeOrderStripe(
        userId: string,
        placeOrderDto: PlaceOrderStripeDto,
        origin: string,
    ): Promise<{ success: boolean; url?: string; message?: string }> {
        try {
            const { items, address } = placeOrderDto;

            if (items.length === 0) {
                throw new Error('Please add product first');
            }

            const productData: Array<{
                name: string;
                price: number;
                quantity: number;
            }> = [];

            // Calculate amount using items
            let subtotal = 0;
            for (const item of items) {
                const product = await this.productModel.findById(item.product);
                if (!product) {
                    throw new NotFoundException(
                        `Product with ID ${item.product} not found`,
                    );
                }
                productData.push({
                    name: product.name,
                    price: product.offerPrice,
                    quantity: item.quantity,
                });
                subtotal += product.offerPrice * item.quantity;
            }

            // Calculate total amount by adding tax and delivery charges
            const taxAmount = subtotal * this.taxPercentage;
            const totalAmount = subtotal + taxAmount + this.deliveryCharges;

            // Create order
            const order = await this.orderModel.create({
                userId,
                items: items.map(item => ({
                    product: new Types.ObjectId(item.product),
                    quantity: item.quantity,
                })),
                amount: totalAmount,
                address,
                paymentMethod: 'stripe',
            });

            // Enqueue order in priority queue
            await this.orderScheduler.enqueueOrder(order._id.toString());

            // Create line items for stripe
            const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = productData.map((item) => {
                return {
                    price_data: {
                        currency: this.currency,
                        product_data: { name: item.name },
                        // Para COP (peso colombiano), no necesitas multiplicar por 277
                        // Solo multiplica por 100 para convertir a centavos
                        unit_amount: Math.floor(item.price * 100),
                    },
                    quantity: item.quantity,
                };
            });

            // Add tax as separate line item
            line_items.push({
                price_data: {
                    currency: this.currency,
                    product_data: { name: 'Tax (2%)' },
                    unit_amount: Math.floor(taxAmount * 100),
                },
                quantity: 1,
            });

            // Add delivery charges as separate line item
            line_items.push({
                price_data: {
                    currency: this.currency,
                    product_data: { name: 'Delivery Charges' },
                    unit_amount: Math.floor(this.deliveryCharges * 100),
                },
                quantity: 1,
            });

            // Create Stripe checkout session
            const session = await this.stripe.checkout.sessions.create({
                line_items,
                mode: 'payment',
                success_url: `${origin}/loader?next=my-orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderId: order._id.toString(),
                    userId,
                },
            });

            if (!session.url) {
                throw new InternalServerErrorException('Stripe session URL is null');
            }

            return { success: true, url: session.url };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async userOrders(userId: string, pagination: PaginationDto = {}): Promise<PaginatedResult<Order>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const cacheKey = `orders:user:${userId}:${page}:${limit}`;

            // Intentar obtener del caché
            const cached = await this.cacheManager.get<PaginatedResult<Order>>(cacheKey);
            if (cached) {
                return cached;
            }

            const skip = (page - 1) * limit;
            const filter = {
                userId,
                $or: [{ paymentMethod: 'COD' }, { isPaid: true }],
            };

            const [data, total] = await Promise.all([
                this.orderModel
                    .find(filter)
                    .populate({
                        path: 'items.product',
                        model: 'Product',
                    })
                    .populate('address')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.orderModel.countDocuments(filter),
            ]);

            const result: PaginatedResult<Order> = {
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            };

            // Guardar en caché por 30 segundos (órdenes cambian frecuentemente)
            await this.cacheManager.set(cacheKey, result, 30);

            return result;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async allOrders(pagination: PaginationDto = {}): Promise<PaginatedResult<Order>> {
        try {
            const { page = 1, limit = 20 } = pagination;
            const skip = (page - 1) * limit;
            const filter = { $or: [{ paymentMethod: 'COD' }, { isPaid: true }] };

            const [data, total] = await Promise.all([
                this.orderModel
                    .find(filter)
                    .populate('items.product')
                    .populate('address')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.orderModel.countDocuments(filter),
            ]);

            return {
                data,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            };
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async updateStatus(
        updateOrderStatusDto: UpdateOrderStatusDto,
    ): Promise<{ message: string }> {
        try {
            const { orderId, status } = updateOrderStatusDto;

            const order = await this.orderModel.findByIdAndUpdate(
                orderId,
                { status },
                { new: true },
            );

            if (!order) {
                throw new NotFoundException('Order not found');
            }

            // Si la orden se marca como completada/entregada, incrementar contador del usuario
            if (status === 'Delivered') {
                await this.userModel.findByIdAndUpdate(order.userId, {
                    $inc: { completedOrders: 1 },
                });
            }

            // Si la orden se cancela o completa, remover de la cola de prioridad
            if (status === 'Delivered' || status === 'Cancelled') {
                this.orderScheduler.completeOrder(orderId);
            }

            return { message: 'Order status updated' };
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async handleStripeWebhook(
        rawBody: Buffer,
        signature: string,
    ): Promise<void> {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
        }

        let event: Stripe.Event;

        try {
            // Construct and verify the webhook event
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret,
            );
        } catch (error: any) {
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }

        // Handle the event based on type
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                // Get metadata from the session
                if (!session.metadata || !('orderId' in session.metadata) || !('userId' in session.metadata)) {
                    throw new Error('Missing metadata in checkout session');
                }
                const orderId = (session.metadata as any).orderId;
                const userId = (session.metadata as any).userId;

                if (!orderId || !userId) {
                    throw new Error('Missing metadata in checkout session');
                }

                // Mark order as paid
                await this.orderModel.findByIdAndUpdate(orderId, { isPaid: true });

                // Remove from priority queue (order is now paid, will be processed)
                this.orderScheduler.completeOrder(orderId);

                // Clear user cart
                await this.userModel.findByIdAndUpdate(userId, { cartData: {} });

                console.log(`Payment succeeded for order ${orderId}`);
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object as Stripe.Checkout.Session;

                const { orderId } = session.metadata || {};

                if (orderId) {
                    // Remove from priority queue
                    this.orderScheduler.completeOrder(orderId);

                    // Delete order if checkout session expired
                    await this.orderModel.findByIdAndDelete(orderId);
                    console.log(`Checkout expired, order ${orderId} deleted`);
                }
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;

                // Get the checkout session associated with this payment intent
                const sessions = await this.stripe.checkout.sessions.list({
                    payment_intent: paymentIntent.id,
                });

                if (sessions.data.length > 0) {
                    const { orderId } = sessions.data[0].metadata || {};

                    if (orderId) {
                        // Remove from priority queue
                        this.orderScheduler.completeOrder(orderId);

                        // Delete order if payment failed
                        await this.orderModel.findByIdAndDelete(orderId);
                        console.log(`Payment failed, order ${orderId} deleted`);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
                break;
        }
    }

    async getQueueStatus(): Promise<Array<{
        orderId: string;
        priority: number;
        createdAt: Date;
    }>> {
        return this.orderScheduler.getQueueStatus();
    }

    async getQueueSize(): Promise<number> {
        return this.orderScheduler.getQueueSize();
    }

    async processNextBatch(
        batchSize: number,
    ): Promise<Array<{ orderId: string; priority: number }>> {
        return this.orderScheduler.processNextBatch(batchSize);
    }

    async rebalanceQueue(): Promise<void> {
        return this.orderScheduler.rebalanceQueue();
    }
}
