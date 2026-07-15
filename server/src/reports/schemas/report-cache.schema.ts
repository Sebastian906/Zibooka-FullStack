import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportCacheDocument = HydratedDocument<ReportCache>;

@Schema({
    timestamps: true,  // Agrega createdAt y updatedAt automáticamente
    expires: 24 * 60 * 60  // TTL de 24 horas en segundos
})
export class ReportCache {
    @Prop({ required: true, index: true })
    cacheKey: string;

    @Prop({ required: true, enum: ['inventory', 'loans', 'inventory-optimized'] })
    reportType: string;

    @Prop({ type: Object, default: {} })
    filters: Record<string, any>;

    @Prop({ type: Object, required: true })
    data: any;

    @Prop({ required: true })
    recordCount: number;

    @Prop({ required: true })
    generationTimeMs: number;

    @Prop({ type: Date, default: Date.now })
    expiresAt: Date;

    @Prop({ type: Date, default: Date.now })
    createdAt: Date;

    @Prop({ type: Date, default: Date.now })
    updatedAt: Date;
}

export const ReportCacheSchema = SchemaFactory.createForClass(ReportCache);

// Índice compuesto para búsquedas eficientes por tipo y filtros
ReportCacheSchema.index({ reportType: 1, cacheKey: 1 });