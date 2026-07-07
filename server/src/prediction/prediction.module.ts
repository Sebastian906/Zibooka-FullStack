import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PredictionClient } from './prediction-client.service';
import { PredictionController } from './prediction.controller';

@Module({
    imports: [ConfigModule],
    controllers: [PredictionController],
    providers: [PredictionClient],
    exports: [PredictionClient],
})
export class PredictionModule { }
