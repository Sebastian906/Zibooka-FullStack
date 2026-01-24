import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument, Types } from "mongoose"

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
    @Prop({
        type: String,
        unique: true,
        sparse: true,
        index: true,
    })
    isbn?: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({
        type: String,
        default: 'Unknown Author',
        index: true
    })
    author?: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    offerPrice: number;

    @Prop({
        type: Number,
        default: null,
        min: 1,
        max: 5000
    })
    pageCount?: number;

    @Prop({ type: String, default: null })
    publisher?: string;

    @Prop({
        type: Number,
        default: null,
        min: 1800,
        max: new Date().getFullYear()  // No futuro
    })
    publicationYear?: number;

    @Prop({ type: [String], required: true })
    images: string[];

    @Prop({ required: true })
    category: string;

    @Prop({ type: Boolean, default: false })
    popular?: boolean;

    @Prop({ type: Boolean, default: true })
    inStock: boolean;

    @Prop({
        type: Types.ObjectId,
        ref: 'Shelf',
        default: null
    })
    shelfLocation?: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);