import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})

export class ReservationModule { }