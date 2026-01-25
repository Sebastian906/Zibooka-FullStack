import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({ timestamps: true })
export class Reservation {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
    bookId: Types.ObjectId;

    @Prop({ type: Date, required: true, default: Date.now })
    requestDate: Date;

    @Prop({ type: String, enum: ['pending', 'fulfilled', 'cancelled', 'expired'], default: 'pending', index: true })
    status: string;

    @Prop({ type: Number, required: true })
    priority: number;

    @Prop({ type: Date, default: null })
    notifiedAt: Date | null;

    @Prop({ type: Date, default: null })
    fulfilledAt: Date | null;

    @Prop({ type: Date, required: true })
    expiresAt: Date;

    @Prop({ type: String })
    notes?: string;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);