import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { getMongoConfig } from './config/mongodb.config';
import { UserModule } from './users/user.module';
import { AdminModule } from './admin/admin.module';
import { ProductModule } from './products/product.module';
import { CartController } from './carts/cart.controller';
import { AddressModule } from './addresses/address.module';
import { OrderModule } from './orders/order.module';

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

    UserModule,
    AdminModule,
    ProductModule,
    AddressModule,
    OrderModule,
  ],
  controllers: [AppController, CartController],
  providers: [AppService],
})
export class AppModule {}
