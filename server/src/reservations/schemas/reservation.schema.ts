
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

    @Prop({ type: Number, default: null })
    estimatedWaitDays: number | null;

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

// Índice compuesto para la cola de espera: find({bookId, status}).sort({priority})
ReservationSchema.index({ bookId: 1, status: 1, priority: 1 });

// Índice compuesto para getUserReservationList(): find({userId}).sort({requestDate: -1})
ReservationSchema.index({ userId: 1, requestDate: -1 });