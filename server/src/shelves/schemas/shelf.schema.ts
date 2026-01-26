import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ShelfDocument = HydratedDocument<Shelf>;

@Schema({ timestamps: true })
export class Shelf {
    @Prop({ type: String, required: true, unique: true, uppercase: true })
    code: string;

    @Prop({ type: Number, required: true, default: 8 })
    maxWeight: number;

    @Prop({ type: Number, default: 0 })
    currentWeight: number;

    @Prop({ type: Number, default: 0 })
    currentValue: number;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
    books: Types.ObjectId[];

    @Prop({ type: String, required: true })
    location: string;

    @Prop({ type: String, enum: ['safe', 'at-risk', 'overloaded'], default: 'safe' })
    status: string;

    @Prop({ type: String })
    description?: string;
}

export const ShelfSchema = SchemaFactory.createForClass(Shelf);