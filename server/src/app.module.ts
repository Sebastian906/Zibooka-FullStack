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
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './notifications/notification.module';

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

    // Cache distribuido: Redis con fallback a memoria
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');

        if (redisHost) {
          return {
            store: await redisStore({
              host: redisHost,
              port: redisPort || 6379,
              ttl: 60, // 60 segundos por defecto
            }),
          };
        }

        // Fallback a caché en memoria si Redis no está configurado
        console.log('[CacheModule] Redis not configured, using in-memory cache');
        return { ttl: 60 };
      },
    }),

    // Rate limiting global: 100 requests por 60 segundos por IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [{
        ttl: configService.get<number>('THROTTLE_TTL', 60000),
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
      }],
    }),

    ScheduleModule.forRoot(),

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
    NotificationModule,
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
