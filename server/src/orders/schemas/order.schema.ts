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
}

export const OrderSchema = SchemaFactory.createForClass(Order);