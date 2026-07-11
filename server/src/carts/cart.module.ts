import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Reservation, ReservationSchema } from '../reservations/schemas/reservation.schema';
import { CartController } from './cart.controller';
import { CartOptimizationService } from './services/cart-optimization.service';
import { UserService } from '../users/user.service';
import { ReservationModule } from '../reservations/reservation.module';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Reservation.name, schema: ReservationSchema },
        ]),
        ReservationModule,
        EmailModule,
    ],
    controllers: [CartController],
    providers: [
        UserService,
        CartOptimizationService,
    ],
    exports: [CartOptimizationService],
})
export class CartModule { }
