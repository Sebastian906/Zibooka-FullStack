import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShelfService } from './shelf.service';

@ApiTags('Shelf')
@Controller('shelf')
export class ShelfController {
    constructor(private readonly shelfService: ShelfService) {}
}