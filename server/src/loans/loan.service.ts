import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Loan, LoanDocument } from './schemas/loan.schema';
import { Model } from 'mongoose';

@Injectable()
export class LoanService {
    constructor(
        @InjectModel(Loan.name) private loanModel: Model<LoanDocument>
    ) {}
}
