import { Module } from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Shelf, ShelfSchema } from './schemas/shelf.schema';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { ShelfController } from './shelf.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shelf.name, schema: ShelfSchema },
      { name: Product.name, schema: ProductSchema }
    ]),
  ],
  controllers: [ShelfController],
  providers: [ShelfService],
  exports: [ShelfService],
})

export class ShelfModule {}