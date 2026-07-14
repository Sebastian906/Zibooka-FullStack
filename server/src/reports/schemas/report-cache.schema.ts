import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportCacheDocument = HydratedDocument<ReportCache>;

@Schema({ expires: '1h' })  // TTL automático de 1 hora
export class ReportCache {
    @Prop({ required: true, index: true })
    cacheKey: string;

    @Prop({ required: true })
    reportType: string;  // 'inventory' | 'loans'

    @Prop({ type: Object, default: {} })
    filters: Record<string, any>;

    @Prop({ type: Object, required: true })
    data: any;

    @Prop({ default: () => new Date(Date.now() + 60 * 60 * 1000) })
    expiresAt: Date;
}

export const ReportCacheSchema = SchemaFactory.createForClass(ReportCache);