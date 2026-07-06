import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PredictionClient } from './prediction-client.service';

describe('PredictionClient', () => {
    let service: PredictionClient;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PredictionClient,
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string, defaultValue: string) => defaultValue,
                    },
                },
            ],
        }).compile();

        service = module.get<PredictionClient>(PredictionClient);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('healthCheck', () => {
        it('should return false when service is unreachable', async () => {
            const result = await service.healthCheck();
            expect(result).toBe(false);
        });
    });

    describe('predictWaitTime', () => {
        it('should return null when service is unreachable', async () => {
            const result = await service.predictWaitTime({
                book_popularity_score: 5,
                active_loans_count: 2,
                avg_loan_duration: 14,
                day_of_week: 2,
                user_history_count: 3,
            });
            expect(result).toBeNull();
        });
    });

    describe('predictDemand', () => {
        it('should return null when service is unreachable', async () => {
            const result = await service.predictDemand({
                total_loans: 10,
                unique_users: 5,
                avg_rating: 4.0,
                days_since_added: 100,
                category_encoded: 2,
                author_popularity: 6.0,
            });
            expect(result).toBeNull();
        });
    });

    describe('predictOverdue', () => {
        it('should return null when service is unreachable', async () => {
            const result = await service.predictOverdue({
                loan_duration_days: 14,
                user_total_loans: 3,
                user_overdue_rate: 0.2,
                book_overdue_rate: 0.15,
                days_until_due: 5,
                is_weekend: false,
            });
            expect(result).toBeNull();
        });
    });

    describe('predictAnomaly', () => {
        it('should return null when service is unreachable', async () => {
            const result = await service.predictAnomaly({
                loans_per_month: 8,
                avg_loan_duration: 12,
                overdue_rate: 0.1,
                total_spent: 250,
                unique_categories: 4,
                weekend_loans: 2,
            });
            expect(result).toBeNull();
        });
    });
});
