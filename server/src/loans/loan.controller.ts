import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoanService } from './loan.service';

@ApiTags('Loans')
@Controller('loan')
export class LoanController {
    constructor(private readonly loanService: LoanService) {}
}