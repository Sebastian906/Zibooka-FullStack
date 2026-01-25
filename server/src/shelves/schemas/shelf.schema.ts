import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ShelfDocument = HydratedDocument<Shelf>;

@Schema({ timestamps: true })
export class Shelf {
    @Prop({ type: String, required: true, unique: true, uppercase: true })
    code: string;

    @Prop({ type: Number, required: true, default: 3000 })
    maxPages: number;

    @Prop({ type: Number, default: 0 })
    currentPages: number; 

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
    books: Types.ObjectId[];

    @Prop({ type: String, required: true })
    location: string; 

    @Prop({ type: String, enum: ['available', 'full', 'overloaded'], default: 'available' })
    status: string;

    @Prop({ type: String })
    description?: string;
}

export const ShelfSchema = SchemaFactory.createForClass(Shelf);