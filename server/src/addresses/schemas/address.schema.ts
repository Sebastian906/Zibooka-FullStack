import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose";

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    street: string;

    @Prop({ required: true })
    city: string;

    @Prop({ required: true })
    state: string;

    @Prop({ required: true })
    country: string;

    @Prop({ required: true })
    zipcode: string;

    @Prop({ required: true })
    phone: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Índice compuesto para getAddresses(): find({userId}).sort({createdAt: -1})
AddressSchema.index({ userId: 1, createdAt: -1 });