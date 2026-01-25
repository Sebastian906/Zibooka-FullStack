import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Shelf, ShelfDocument } from './schemas/shelf.schema';
import { Model } from 'mongoose';

@Injectable()
export class ShelfService {
    constructor(
        @InjectModel(Shelf.name) private shelfModel: Model<ShelfDocument>
    ) { }
}