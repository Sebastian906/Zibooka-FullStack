import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';

@ApiTags('Reservations')
@Controller('reservation')
export class ReservationController {
    constructor(private readonly reservationService: ReservationService) { }
}