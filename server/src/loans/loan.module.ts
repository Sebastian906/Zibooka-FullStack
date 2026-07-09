import { Module } from '@nestjs/common';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Loan, LoanSchema } from './schemas/loan.schema';
import { HighRiskLoan, HighRiskLoanSchema } from './schemas/high-risk-loan.schema';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { setupLoanMiddleware } from './middlewares/loan.middleware';
import { ProductModule } from 'src/products/product.module';
import { ReservationModule } from 'src/reservations/reservation.module';
import { PredictionModule } from 'src/prediction/prediction.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: Loan.name,
        useFactory: () => {
          const schema = LoanSchema;
          setupLoanMiddleware();
          return schema;
        },
      },
      { name: Product.name, useFactory: () => ProductSchema },
      { name: User.name, useFactory: () => UserSchema },
      { name: HighRiskLoan.name, useFactory: () => HighRiskLoanSchema },
    ]),
    ProductModule,
    ReservationModule,
    PredictionModule,
    EmailModule,
  ],
  controllers: [LoanController],
  providers: [LoanService],
  exports: [LoanService],
})

export class LoanModule { }