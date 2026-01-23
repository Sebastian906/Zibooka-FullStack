import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { PlaceOrderCODDto } from './dto/place-order-cod.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PlaceOrderStripeDto } from './dto/place-order-stripe';

@Injectable()
export class OrderService {

    // Global variables for payment
    private readonly currency = 'cop';
    private readonly deliveryCharges = 10; // 10 Dollars
    private readonly taxPercentage = 0.02; // 2% tax
    private stripe: Stripe;

    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private configService: ConfigService,
    ) { 
        // Initialize Stripe
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not defined');
        }
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-12-15.clover',
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
            await this.orderModel.create({
                userId,
                items: items.map(item => ({
                    product: new Types.ObjectId(item.product),
                    quantity: item.quantity,
                })),
                amount: totalAmount,
                address,
                paymentMethod: 'COD',
            });

            // Clear user cart
            await this.userModel.findByIdAndUpdate(userId, { cartData: {} });

            return { message: 'Order Placed' };
        } catch (error) {
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
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    async userOrders(userId: string): Promise<Order[]> {
        try {
            const orders = await this.orderModel
                .find({
                    userId,
                    $or: [{ paymentMethod: 'COD' }, { isPaid: true }],
                })
                .populate({
                    path: 'items.product',
                    model: 'Product',
                })
                .populate('address')
                .sort({ createdAt: -1 });

            return orders;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    async allOrders(): Promise<Order[]> {
        try {
            const orders = await this.orderModel
                .find({
                    $or: [{ paymentMethod: 'COD' }, { isPaid: true }],
                })
                .populate('items.product')
                .populate('address')
                .sort({ createdAt: -1 });

            return orders;
        } catch (error) {
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

            return { message: 'Order status updated' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }
}
