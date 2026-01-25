import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type LoanDocument = HydratedDocument<Loan>;

@Schema({ timestamps: true })
export class Loan {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
    bookId: Types.ObjectId;

    @Prop({ type: Date, required: true, default: Date.now })
    loanDate: Date;

    @Prop({ type: Date, required: true })
    dueDate: Date;

    @Prop({ type: Date, default: null })
    returnDate: Date | null;

    @Prop({ type: String, enum: ['active', 'returned', 'overdue'], default: 'active', index: true })
    status: string;

    @Prop({ type: Number, default: 0 })
    lateFee: number; 

    @Prop({ type: String })
    notes?: string;
}

export const LoanSchema = SchemaFactory.createForClass(Loan);