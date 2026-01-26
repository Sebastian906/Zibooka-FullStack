import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Loan, LoanDocument } from './schemas/loan.schema';
import { Model, Types } from 'mongoose';
import { ProductService } from 'src/products/product.service';
import { ReservationService } from 'src/reservations/reservation.service';

@Injectable()
export class LoanService {
    constructor(
        @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
        private productService: ProductService,
        private reservationService: ReservationService,
    ) { }

    /**
     * STACK (LIFO) - Obtiene historial de préstamos del usuario
     * Los préstamos más recientes aparecen primero (Last In, First Out)
     * 
     * @param userId - ID del usuario
     * @returns Array de préstamos ordenados LIFO
     */
    async getUserLoanHistory(userId: string): Promise<Loan[]> {
        try {
            const loans = await this.loanModel
                .find({ userId: new Types.ObjectId(userId) })
                .populate('bookId')
                .sort({ loanDate: -1 })
                .exec();

            console.log(`[LoanService] Retrieved ${loans.length} loans for user (LIFO order)`);
            return loans;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Agrega un préstamo (Push a la pila)
     * 
     * @param userId - ID del usuario
     * @param bookId - ID del libro
     * @returns Préstamo creado
     */
    async createLoan(userId: string, bookId: string): Promise<Loan> {
        try {
            const product = await this.productService.getSingleProduct(bookId);

            if (!product.inStock) {
                throw new Error('Book is not available for loan');
            }

            const loan = await this.loanModel.create({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                loanDate: new Date(),
                status: 'active',
            });

            console.log(`[LoanService] Loan created (pushed to stack): ${loan._id}`);

            await this.productService.changeStock({
                productId: bookId,
                inStock: false
            });

            return loan;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene el último préstamo del usuario (Peek de la pila)
     * 
     * @param userId - ID del usuario
     * @returns Último préstamo activo o null
     */
    async getLastActiveLoan(userId: string): Promise<Loan | null> {
        try {
            const loan = await this.loanModel
                .findOne({
                    userId: new Types.ObjectId(userId),
                    status: 'active'
                })
                .populate('bookId')
                .sort({ loanDate: -1 })
                .exec();

            return loan;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Devuelve un libro (marca como devuelto)
     * CRÍTICO: Verifica si hay reservas pendientes usando búsqueda binaria
     * 
     * @param loanId - ID del préstamo
     * @returns Préstamo actualizado
     */
    async returnBook(loanId: string): Promise<{
        loan: Loan;
        assignedToReservation: boolean;
        reservationInfo?: {
            userId: Types.ObjectId;
            reservationId: string;
            priority: number;
        };
    }> {
        try {
            const loan = await this.loanModel
                .findById(loanId)
                .populate('bookId')
                .exec();

            if (!loan) {
                throw new NotFoundException('Loan not found');
            }

            if (loan.status !== 'active') {
                throw new Error('Loan is not active');
            }

            // Marcar préstamo como devuelto
            loan.returnDate = new Date();
            loan.status = 'returned';

            if (loan.returnDate > loan.dueDate) {
                loan.status = 'overdue';
            }

            await loan.save();

            // BÚSQUEDA BINARIA CRÍTICA
            const bookISBN = (loan.bookId as any).isbn;
            let assignedToReservation = false;
            let reservationInfo: {
                userId: Types.ObjectId;
                reservationId: string;
                priority: number;
            } | undefined;

            if (bookISBN) {
                const searchResult = this.productService.searchByISBN(bookISBN);

                if (searchResult.found) {
                    console.log(`[LoanService] Book found via binary search: ${bookISBN}`);

                    const nextReservation = await this.reservationService.getNextPendingReservation(
                        (loan.bookId as any)._id.toString()
                    );

                    if (nextReservation) {
                        const reservationDoc = nextReservation as any;

                        await this.reservationService.fulfillReservation(
                            reservationDoc._id.toString()
                        );

                        assignedToReservation = true;
                        reservationInfo = {
                            userId: nextReservation.userId,
                            reservationId: reservationDoc._id.toString(),
                            priority: nextReservation.priority
                        };

                        console.log(`[LoanService] Book assigned to reservation: ${reservationDoc._id}`);
                    } else {
                        await this.productService.changeStock({
                            productId: (loan.bookId as any)._id.toString(),
                            inStock: true
                        });
                    }
                }
            }

            console.log(`[LoanService] Book returned: ${loanId}, Assigned to reservation: ${assignedToReservation}`);

            return {
                loan,
                assignedToReservation,
                reservationInfo
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Calcula estadísticas del historial de préstamos
     */
    async getUserLoanStats(userId: string): Promise<{
        total: number;
        active: number;
        returned: number;
        overdue: number;
    }> {
        try {
            const loans = await this.loanModel.find({
                userId: new Types.ObjectId(userId)
            }).exec();

            return {
                total: loans.length,
                active: loans.filter(l => l.status === 'active').length,
                returned: loans.filter(l => l.status === 'returned').length,
                overdue: loans.filter(l => l.status === 'overdue').length,
            };
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
