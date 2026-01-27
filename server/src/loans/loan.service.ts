import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Loan, LoanDocument } from './schemas/loan.schema';
import { Model, Types } from 'mongoose';
import { ProductService } from 'src/products/product.service';
import { ReservationService } from 'src/reservations/reservation.service';
import { Product } from 'src/products/schemas/product.schema';

@Injectable()
export class LoanService {
    constructor(
        @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
        @InjectModel(Product.name) private productModel: Model<Product>,
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
    async createLoan(bookId: string, userId: string): Promise<Loan> {
        try {
            // Verificar que el libro (producto) exista y esté disponible
            const book = await this.productModel.findById(bookId); 
            if (!book) {
                throw new NotFoundException('Book not found');
            }

            if (!book.inStock) {
                throw new BadRequestException('Book is currently out of stock');
            }

            // Verificar que el usuario no tenga préstamos activos del mismo libro
            const existingActiveLoan = await this.loanModel.findOne({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                status: 'active'
            });

            if (existingActiveLoan) {
                throw new BadRequestException('You already have an active loan for this book');
            }

            const loanDate = new Date();
            const dueDate = new Date(loanDate.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 días

            // Crear el préstamo
            const newLoan = new this.loanModel({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                loanDate: loanDate,
                dueDate: dueDate, 
                status: 'active'
            });

            await newLoan.save();

            // Actualizar el stock del libro (producto)
            book.inStock = false;
            await book.save();

            console.log(`[LoanService] Loan created successfully for book ${bookId} by user ${userId}`);
            return newLoan;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
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
    async getUserLoanStats(userId: string) {
        try {
            const loans = await this.loanModel.find({ userId: new Types.ObjectId(userId) });

            const stats = {
                total: loans.length,
                active: loans.filter(l => l.status === 'active').length,
                completed: loans.filter(l => l.status === 'completed').length,
                overdue: loans.filter(l => l.status === 'overdue').length,
            };

            console.log(`[LoanService] Loan stats for user ${userId}:`, stats);
            return stats;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene TODOS los préstamos del sistema (Admin only)
     * @returns Array de préstamos con información de usuario y libro
     */
    async getAllLoans(): Promise<Loan[]> {
        try {
            const loans = await this.loanModel
                .find()
                .populate('bookId')
                .populate('userId')
                .sort({ loanDate: -1 })  // Stack (LIFO) - más reciente primero
                .exec();

            console.log(`[LoanService] Retrieved ${loans.length} total loans`);
            return loans;
        } catch (error) {
            throw new InternalServerErrorException(error.message);
        }
    }
}
