import { Controller, Post, Body, UseGuards, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PredictionClient } from './prediction-client.service';
import { DemandListRequestDto } from './dto/demand-list.dto';
import { AdminAuthGuard } from '../common/guards/admin-auth/admin-auth.guard';

@Controller('prediction')
export class PredictionController {
    private readonly logger = new Logger(PredictionController.name);

    constructor(private readonly predictionClient: PredictionClient) { }

    @Post('demand-list')
    @UseGuards(AdminAuthGuard)
    async getDemandList(@Body() body: DemandListRequestDto) {
        this.logger.log(`Demand list request: days=${body.days_ahead}, limit=${body.limit}`);

        const result = await this.predictionClient.predictDemandList({
            days_ahead: body.days_ahead ?? 30,
            limit: body.limit ?? 20,
            min_score: body.min_score ?? 0.3,
        });

        if (!result) {
            throw new ServiceUnavailableException('ML service unavailable or model not trained');
        }

        return result;
    }

    @Post('train-demand')
    @UseGuards(AdminAuthGuard)
    async trainDemandModel() {
        this.logger.log('Training demand model from database');
        const result = await this.predictionClient.trainDemandFromDatabase();
        if (!result) {
            throw new ServiceUnavailableException('ML training failed');
        }
        return result;
    }

    @Post('train-wait-time')
    @UseGuards(AdminAuthGuard)
    async trainWaitTimeModel() {
        this.logger.log('Training wait time model from database');
        const result = await this.predictionClient.trainWaitTimeFromDatabase();
        if (!result) {
            throw new ServiceUnavailableException('ML training failed');
        }
        return result;
    }
}