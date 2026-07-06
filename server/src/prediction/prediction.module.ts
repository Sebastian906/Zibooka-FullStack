import { Module } from '@nestjs/common';
import { PredictionClient } from './prediction-client.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [PredictionClient],
    exports: [PredictionClient],
})
export class PredictionModule {}
