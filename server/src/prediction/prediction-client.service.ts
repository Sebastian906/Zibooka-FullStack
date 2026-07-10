import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WaitTimePrediction {
    estimated_days: number;
    confidence_interval: {
        lower: number;
        upper: number;
    };
    confidence: 'low' | 'medium' | 'high';
}

export interface DemandPrediction {
    is_high_demand: boolean;
    probability: number;
}

export interface OverduePrediction {
    risk_score: number;
    is_high_risk: boolean;
    top_features?: Record<string, number>;
}

export interface AnomalyPrediction {
    is_anomaly: boolean;
    anomaly_score: number;
}

export interface DemandListItem {
    product_id: string;
    title: string;
    category: string;
    demand_score: number;
    predicted_loans: number;
    stock_available: boolean;
}

export interface DemandListPrediction {
    predictions: DemandListItem[];
    model_version: string;
    model_metrics: Record<string, unknown>;
    total_books_evaluated: number;
    threshold_used: number;
}

@Injectable()
export class PredictionClient {
    private readonly baseUrl: string | undefined;
    private readonly logger = new Logger(PredictionClient.name);
    private readonly timeout = 5000;

    constructor(private configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('ML_SERVICE_URL');
        if (!this.baseUrl) {
            throw new Error('ML_SERVICE_URL is not defined in environment variables');
        }
    }

    private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                this.logger.warn(`ML service returned ${response.status} for ${endpoint}`);
                return null;
            }

            return (await response.json()) as T;
        } catch (error) {
            this.logger.warn(`ML service request failed for ${endpoint}: ${error}`);
            return null;
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${this.baseUrl}/health`, {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) return false;
            const data = await response.json();
            return data?.status === 'healthy';
        } catch {
            return false;
        }
    }

    /**
     * Predice el tiempo de espera para una reserva.
     * El microservicio ML computa las features restantes desde MongoDB.
     *
     * @param productId - ID del libro
     * @param queuePosition - Posición en la cola de espera (priority)
     * @returns WaitTimePrediction con estimated_days, confidence_interval y confidence
     */
    async estimateWaitTime(
        productId: string,
        queuePosition: number,
    ): Promise<WaitTimePrediction | null> {
        return this.post<WaitTimePrediction>('/predict/wait-time', {
            product_id: productId,
            queue_position: queuePosition,
        });
    }

    async predictDemand(features: {
        total_loans: number;
        unique_users: number;
        avg_rating: number;
        days_since_added: number;
        category_encoded: number;
        author_popularity: number;
    }): Promise<DemandPrediction | null> {
        return this.post<DemandPrediction>('/predict/demand', features);
    }

    async predictDemandList(features: {
        days_ahead: number;
        limit: number;
        min_score: number;
    }): Promise<DemandListPrediction | null> {
        return this.post<DemandListPrediction>('/predict/demand/list', features);
    }

    async trainDemandFromDatabase(): Promise<{
        message: string;
        metrics: Record<string, unknown>;
        feature_importance: Record<string, number>;
    } | null> {
        return this.post('/train/demand/from-database', {});
    }

    /**
     * Entrena el modelo de tiempo de espera con datos reales de reservas.
     */
    async trainWaitTimeFromDatabase(): Promise<{
        message: string;
        metrics: Record<string, unknown>;
        feature_importance: Record<string, number>;
    } | null> {
        return this.post('/train/wait-time/from-database', {});
    }

    /**
     * Predice riesgo de overdue con las 6 features existentes
     */
    async predictOverdue(features: {
        loan_duration_days: number;
        user_total_loans: number;
        user_overdue_rate: number;
        book_overdue_rate: number;
        days_until_due: number;
        is_weekend: boolean;
    }): Promise<OverduePrediction | null> {
        return this.post<OverduePrediction>('/predict/overdue', features);
    }

    /**
     * Predice riesgo de overdue con 13 features extendidas
     * Incluye features de usuario, libro y contexto temporal
     */
    async predictOverdueExtended(features: {
        user_previous_loans_count: number;
        user_overdue_count: number;
        user_overdue_rate: number;
        user_avg_late_days: number;
        user_days_since_last_loan: number;
        user_total_loans_completed: number;
        book_overdue_rate: number;
        book_total_loans: number;
        book_avg_loan_duration: number;
        day_of_week_loan: number;
        category_encoded: number;
        is_weekend: number;
        loan_hour: number;
    }): Promise<OverduePrediction | null> {
        return this.post<OverduePrediction>('/predict/overdue-extended', features);
    }

    async predictAnomaly(features: {
        loans_per_month: number;
        avg_loan_duration: number;
        overdue_rate: number;
        total_spent: number;
        unique_categories: number;
        weekend_loans: number;
    }): Promise<AnomalyPrediction | null> {
        return this.post<AnomalyPrediction>('/predict/anomaly', features);
    }

    /**
     * Entrena el modelo de overdue con datos de la base de datos
     */
    async trainOverdueFromDatabase(): Promise<{
        message: string;
        metrics: Record<string, unknown>;
        feature_importance: Record<string, number>;
    } | null> {
        return this.post('/train/overdue/from-database', {});
    }
}