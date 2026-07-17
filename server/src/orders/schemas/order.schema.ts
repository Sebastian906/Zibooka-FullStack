import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type OrderDocument = HydratedDocument<Order>;

class OrderItem {
    @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
    product: Types.ObjectId;

    @Prop({ required: true })
    quantity: number;
}

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: [OrderItem], required: true })
    items: OrderItem[];

    @Prop({ required: true })
    amount: number;

    @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
    address: Types.ObjectId;

    @Prop({ default: 'Order Placed' })
    status: string;

    @Prop({ required: true })
    paymentMethod: string;

    @Prop({ required: true, default: false })
    isPaid: boolean;

    @Prop({ type: Number, default: null })
    priority: number | null;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;

    @Prop({ type: Date, default: Date.now })
    updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Índice compuesto para userOrders(): filtra por userId + sort por createdAt
OrderSchema.index({ userId: 1, createdAt: -1 });

// Índice para rebuildQueue(): filtra por status
OrderSchema.index({ status: 1 });

// Índice para allOrders(): sort por createdAt sin filtro de usuario
OrderSchema.index({ createdAt: -1 });