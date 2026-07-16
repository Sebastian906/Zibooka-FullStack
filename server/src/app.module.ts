import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getMongoConfig } from './config/mongodb.config';
import { UserModule } from './users/user.module';
import { AdminModule } from './admin/admin.module';
import { ProductModule } from './products/product.module';
import { AddressModule } from './addresses/address.module';
import { OrderModule } from './orders/order.module';
import { ShelfModule } from './shelves/shelf.module';
import { LoanModule } from './loans/loan.module';
import { ReservationModule } from './reservations/reservation.module';
import { ReportModule } from './reports/report.module';
import { EmailModule } from './email/email.module';
import { MigrationModule } from './migration/migration.module';
import { PredictionModule } from './prediction/prediction.module';
import { CartModule } from './carts/cart.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Configuración de MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getMongoConfig,
      inject: [ConfigService],
    }),

    // Rate limiting global: 100 requests por 60 segundos por IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    UserModule,
    AdminModule,
    ProductModule,
    AddressModule,
    OrderModule,
    ShelfModule,
    LoanModule,
    ReservationModule,
    ReportModule,
    EmailModule,
    MigrationModule,
    PredictionModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
