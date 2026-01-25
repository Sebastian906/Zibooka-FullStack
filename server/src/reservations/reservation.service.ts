import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';

@Injectable()
export class ReservationService {
    constructor(
        @InjectModel(Reservation.name)
        private reservationModel: Model<ReservationDocument>
    ) { }
}