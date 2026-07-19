import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({
        type: String,
        enum: ['loan_reminder', 'reservation_reminder', 'manual'],
        required: true,
        index: true,
    })
    type: string;

    @Prop({ type: String, required: true })
    subject: string;

    @Prop({ type: String, default: '' })
    message: string;

    @Prop({ type: Types.ObjectId, required: false, index: true })
    relatedId?: Types.ObjectId;

    @Prop({ type: String, enum: ['Loan', 'Reservation'], required: false })
    relatedModel?: string;

    @Prop({ type: Date, default: Date.now, required: true })
    sentAt: Date;

    @Prop({
        type: String,
        enum: ['sent', 'failed', 'pending'],
        required: true,
        default: 'pending',
    })
    status: string;

    @Prop({ type: String, default: null })
    error: string | null;

    @Prop({ type: String, enum: ['system', 'admin'], required: true })
    sentBy: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Índice compuesto para queries del admin: historial por usuario y fecha
NotificationSchema.index({ userId: 1, sentAt: -1 });

// Índice compuesto para verificar duplicados: misma entidad + mismo tipo
NotificationSchema.index({ relatedId: 1, relatedModel: 1, type: 1 });
