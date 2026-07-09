import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type HighRiskLoanDocument = HydratedDocument<HighRiskLoan>;

@Schema({ timestamps: true })
export class HighRiskLoan {
    @Prop({ type: Types.ObjectId, ref: 'Loan', required: true, index: true })
    loanId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    userId: Types.ObjectId;

    @Prop({ required: true, min: 0, max: 1 })
    riskScore: number;

    @Prop({ default: false })
    reviewed: boolean;

    @Prop({ type: Date })
    reviewedAt: Date;

    @Prop({ type: String })
    adminNotes: string;

    @Prop({ type: Boolean, default: false })
    notified: boolean;

    @Prop({ type: Date })
    notifiedAt: Date;
}

export const HighRiskLoanSchema = SchemaFactory.createForClass(HighRiskLoan);