import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Loan, LoanSchema } from 'src/loans/schemas/loan.schema';
import { Reservation, ReservationSchema } from 'src/reservations/schemas/reservation.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';
import { EmailModule } from 'src/email/email.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Notification.name, schema: NotificationSchema },
            { name: Loan.name, schema: LoanSchema },
            { name: Reservation.name, schema: ReservationSchema },
            { name: User.name, schema: UserSchema },
        ]),
        EmailModule,
    ],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationScheduler],
    exports: [NotificationService],
})
export class NotificationModule {}
