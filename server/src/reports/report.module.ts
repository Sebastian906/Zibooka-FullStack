import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { Loan, LoanSchema } from 'src/loans/schemas/loan.schema';
import { Reservation, ReservationSchema } from 'src/reservations/schemas/reservation.schema';
import { Shelf, ShelfSchema } from 'src/shelves/schemas/shelf.schema';
import { ProductModule } from 'src/products/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Loan.name, schema: LoanSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: Shelf.name, schema: ShelfSchema },
    ]),
    ProductModule,
  ],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule { }
