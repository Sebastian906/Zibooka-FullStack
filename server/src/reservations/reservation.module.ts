import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { setupReservationMiddleware } from './middlewares/reservation.middleware';
import { ProductModule } from 'src/products/product.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Reservation.name,
        useFactory: () => {
          const schema = ReservationSchema;
          setupReservationMiddleware();
          return schema;
        },
      },
      { name: Product.name, useFactory: () => ProductSchema },
      { name: User.name, useFactory: () => UserSchema }
    ]),
    ProductModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})

export class ReservationModule { }