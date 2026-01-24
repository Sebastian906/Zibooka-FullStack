import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    offerPrice: number;

    @Prop({ type: [String], required: true })
    images: string[];

    @Prop({ required: true })
    category: string;

    @Prop({ type: Boolean, default: false })
    popular?: boolean;

    @Prop({ type: Boolean, default: true })
    inStock: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);