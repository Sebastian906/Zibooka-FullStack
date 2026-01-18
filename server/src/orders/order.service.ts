import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { PlaceOrderCODDto } from './dto/place-order-cod.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {

    // Global variables for payment
    private readonly currency = 'cop';
    private readonly deliveryCharges = 10; // 10 Dollars
    private readonly taxPercentage = 0.02; // 2% tax

    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Product.name) private productModel: Model<ProductDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async placeOrderCOD(
        userId: string,
        placerOrderDto: PlaceOrderCODDto,
    ): Promise<{ message: string }> {
        try {
            const { items, address } = placerOrderDto;

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
