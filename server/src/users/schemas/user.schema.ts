import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ minimize: false, timestamps: true})
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ type: String, default: null })
    profileImage: string | null;

    @Prop({ type: Object, default: {} })
    cartData: Record<string, any>;

    @Prop({ type: Date, default: null })
    lastLogin: Date | null;

    @Prop({ type: Date, default: null })
    lastLogout: Date | null;

    @Prop({ type: Date, default: null })
    lastActivity: Date | null;

    @Prop({ type: String, default: null })
    sessionToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);