import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Loan, LoanDocument } from './schemas/loan.schema';
import { HighRiskLoan, HighRiskLoanDocument } from './schemas/high-risk-loan.schema';
import { Model, Types } from 'mongoose';
import { ProductService } from 'src/products/product.service';
import { ReservationService } from 'src/reservations/reservation.service';
import { Product } from 'src/products/schemas/product.schema';
import { PredictionClient } from 'src/prediction/prediction-client.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class LoanService {
    private readonly logger = new Logger(LoanService.name);

    constructor(
        @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
        @InjectModel(Product.name) private productModel: Model<Product>,
        @InjectModel(HighRiskLoan.name) private highRiskLoanModel: Model<HighRiskLoanDocument>,
        private productService: ProductService,
        private reservationService: ReservationService,
        private predictionClient: PredictionClient,
        private emailService: EmailService,
    ) { }

    /**
     * STACK (LIFO) - Obtiene historial de préstamos del usuario
     */
    async getUserLoanHistory(userId: string): Promise<Loan[]> {
        try {
            const loans = await this.loanModel
                .find({ userId: new Types.ObjectId(userId) })
                .populate('bookId')
                .sort({ loanDate: -1 })
                .exec();

            this.logger.log(`Retrieved ${loans.length} loans for user (LIFO order)`);
            return loans;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Agrega un préstamo (Push a la pila)
     * Incluye predicción de riesgo de overdue
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

            // Calcular riskScore usando el microservicio ML
            let riskScore = 0.5; // Default neutral
            try {
                riskScore = await this.calculateOverdueRisk(userId, bookId, loanDate);
            } catch (error: any) {
                this.logger.warn(`ML prediction failed, using default risk score: ${error.message}`);
            }

            // Crear el préstamo
            const newLoan = new this.loanModel({
                userId: new Types.ObjectId(userId),
                bookId: new Types.ObjectId(bookId),
                loanDate: loanDate,
                dueDate: dueDate,
                status: 'active',
                riskScore: riskScore,
            });

            await newLoan.save();

            // Si el riesgo es alto, crear alerta y notificar
            if (riskScore > 0.7) {
                await this.handleHighRiskLoan(newLoan, riskScore);
            }

            // Actualizar el stock del libro (producto)
            book.inStock = false;
            await book.save();

            this.logger.log(`Loan created: ${newLoan._id} | riskScore: ${riskScore.toFixed(4)}`);
            return newLoan;
        } catch (error: any) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Calcula el riesgo de overdue usando las features extendidas
     * Fallback a 0.5 si el servicio ML no está disponible
     */
    private async calculateOverdueRisk(
        userId: string,
        bookId: string,
        loanDate: Date
    ): Promise<number> {
        // Construir features en tiempo real desde MongoDB
        const features = await this.buildOverdueFeatures(userId, bookId, loanDate);

        // Intentar predicción extendida primero
        const extendedResult = await this.predictionClient.predictOverdueExtended(features);
        if (extendedResult) {
            return extendedResult.risk_score;
        }

        // Fallback: usar modelo básico con 6 features
        const basicFeatures = {
            loan_duration_days: 14,
            user_total_loans: features.user_previous_loans_count,
            user_overdue_rate: features.user_overdue_rate,
            book_overdue_rate: features.book_overdue_rate,
            days_until_due: 14,
            is_weekend: features.is_weekend === 1,
        };

        const basicResult = await this.predictionClient.predictOverdue(basicFeatures);
        if (basicResult) {
            return basicResult.risk_score;
        }

        // Último fallback
        return 0.5;
    }

    /**
     * Construye las 13 features extendidas para predicción de overdue
     */
    private async buildOverdueFeatures(
        userId: string,
        bookId: string,
        loanDate: Date
    ): Promise<{
        user_previous_loans_count: number;
        user_overdue_count: number;
        user_overdue_rate: number;
        user_avg_late_days: number;
        user_days_since_last_loan: number;
        user_total_loans_completed: number;
        book_overdue_rate: number;
        book_total_loans: number;
        book_avg_loan_duration: number;
        day_of_week_loan: number;
        category_encoded: number;
        is_weekend: number;
        loan_hour: number;
    }> {
        // Features del usuario
        const userLoans = await this.loanModel.find({
            userId: new Types.ObjectId(userId),
            status: { $in: ['returned', 'overdue'] }
        }).sort({ loanDate: -1 });

        const user_previous_loans_count = userLoans.length;
        const user_overdue_count = userLoans.filter(l => l.status === 'overdue').length;
        const user_overdue_rate = user_previous_loans_count > 0
            ? user_overdue_count / user_previous_loans_count
            : 0;

        // Calcular días promedio de retraso
        let total_late_days = 0;
        let overdue_count = 0;
        for (const loan of userLoans) {
            if (loan.status === 'overdue' && loan.returnDate && loan.dueDate) {
                const lateDays = Math.max(0, Math.floor(
                    (loan.returnDate.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)
                ));
                total_late_days += lateDays;
                overdue_count++;
            }
        }
        const user_avg_late_days = overdue_count > 0 ? total_late_days / overdue_count : 0;

        // Días desde el último préstamo
        const lastLoan = userLoans.length > 0 ? userLoans[0] : null;
        const user_days_since_last_loan = lastLoan
            ? Math.floor((loanDate.getTime() - lastLoan.loanDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        // Préstamos completados exitosamente
        const user_total_loans_completed = userLoans.filter(l => l.status === 'returned').length;

        // Features del libro
        const bookLoans = await this.loanModel.find({
            bookId: new Types.ObjectId(bookId),
            status: { $in: ['returned', 'overdue'] }
        });

        const book_total_loans = bookLoans.length;
        const book_overdue_count = bookLoans.filter(l => l.status === 'overdue').length;
        const book_overdue_rate = book_total_loans > 0
            ? book_overdue_count / book_total_loans
            : 0;

        // Duración promedio del préstamo del libro
        let total_duration = 0;
        let duration_count = 0;
        for (const loan of bookLoans) {
            if (loan.returnDate) {
                const duration = Math.floor(
                    (loan.returnDate.getTime() - loan.loanDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                total_duration += duration;
                duration_count++;
            }
        }
        const book_avg_loan_duration = duration_count > 0 ? total_duration / duration_count : 14;

        // Features temporales
        const day_of_week_loan = loanDate.getDay();
        const is_weekend = (day_of_week_loan === 0 || day_of_week_loan === 6) ? 1 : 0;
        const loan_hour = loanDate.getHours();

        // Category encoded (simplificado - en producción usar LabelEncoder guardado)
        const product = await this.productModel.findById(bookId);
        const category_encoded = this.encodeCategory(product?.category || 'unknown');

        return {
            user_previous_loans_count,
            user_overdue_count,
            user_overdue_rate,
            user_avg_late_days,
            user_days_since_last_loan,
            user_total_loans_completed,
            book_overdue_rate,
            book_total_loans,
            book_avg_loan_duration,
            day_of_week_loan,
            category_encoded,
            is_weekend,
            loan_hour,
        };
    }

    /**
     * Encode simplificado de categorías
     * En producción, debería usar el LabelEncoder del modelo entrenado
     */
    private encodeCategory(category: string): number {
        const categories: Record<string, number> = {
            'fiction': 0,
            'non-fiction': 1,
            'science': 2,
            'technology': 3,
            'history': 4,
            'biography': 5,
            'other': 6,
        };
        return categories[category.toLowerCase()] ?? 6;
    }

    /**
     * Maneja préstamos de alto riesgo
     */
    private async handleHighRiskLoan(loan: LoanDocument, riskScore: number): Promise<void> {
        try {
            // Crear registro de alerta
            await this.highRiskLoanModel.create({
                loanId: loan._id,
                userId: loan.userId,
                riskScore: riskScore,
                notified: false,
            });

            // Notificar por email al admin
            await this.notifyHighRiskLoan(loan, riskScore);

            this.logger.warn(`High risk loan detected: ${loan._id} | score: ${riskScore.toFixed(4)}`);
        } catch (error: any) {
            this.logger.error(`Failed to handle high risk loan: ${error.message}`);
        }
    }

    /**
     * Envía notificación de préstamo de alto riesgo
     */
    private async notifyHighRiskLoan(loan: LoanDocument, riskScore: number): Promise<void> {
        try {
            const adminEmail = process.env.ADMIN_EMAIL;
            if (!adminEmail) {
                this.logger.warn('ADMIN_EMAIL not configured, skipping notification');
                return;
            }

            // Construir contenido del email
            const subject = 'High Risk Loan Alert - ZiBooka';
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(to right, #e7f2f3, white, #e7f2f3); padding: 20px; text-align: center; }
                        .header h1 { margin: 0; color: #2e3031; }
                        .brand { color: #ac81fd; }
                        .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .score { font-size: 24px; font-weight: bold; color: ${riskScore > 0.8 ? '#dc3545' : '#ffc107'}; }
                        .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <h2>High Risk Loan Detected</h2>
                        <div class="alert-box">
                            <p><strong>Risk Score:</strong> <span class="score">${(riskScore * 100).toFixed(1)}%</span></p>
                        </div>
                        <div class="details">
                            <p><strong>Loan ID:</strong> ${loan._id}</p>
                            <p><strong>User ID:</strong> ${loan.userId}</p>
                            <p><strong>Book ID:</strong> ${loan.bookId}</p>
                            <p><strong>Loan Date:</strong> ${loan.loanDate.toLocaleDateString()}</p>
                            <p><strong>Due Date:</strong> ${loan.dueDate.toLocaleDateString()}</p>
                        </div>
                        <p>This loan has been flagged as high risk. Please review the user's history and consider taking appropriate action.</p>
                        <p>Best regards,<br>The ZiBooka System</p>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} ZiBooka. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Usar el servicio de email existente
            await (this.emailService as any).transporter.sendMail({
                from: `"ZiBooka System" <${process.env.EMAIL_USER}>`,
                to: adminEmail,
                subject,
                html,
            });

            this.logger.log(`High risk notification sent to ${adminEmail}`);
        } catch (error: any) {
            this.logger.error(`Failed to send notification: ${error.message}`);
        }
    }

    /**
     * Obtiene el último préstamo del usuario (Peek de la pila)
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
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Devuelve un libro (marca como devuelto)
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

            const bookId = (loan.bookId as any)._id.toString();
            let assignedToReservation = false;
            let reservationInfo: {
                userId: Types.ObjectId;
                reservationId: string;
                priority: number;
            } | undefined;

            // Seleccionar automáticamente el mejor candidato usando scoring compuesto
            const fulfilledReservation = await this.reservationService.fulfillReservation(bookId);

            if (fulfilledReservation) {
                const reservationDoc = fulfilledReservation as any;

                assignedToReservation = true;
                reservationInfo = {
                    userId: (fulfilledReservation.userId as any)._id,
                    reservationId: reservationDoc._id.toString(),
                    priority: fulfilledReservation.priority
                };

                this.logger.log(`Book ${bookId} assigned to reservation: ${reservationDoc._id} (score-based selection)`);
            } else {
                await this.productService.changeStock({
                    productId: bookId,
                    inStock: true
                });
            }

            this.logger.log(`Book returned: ${loanId}, Assigned to reservation: ${assignedToReservation}`);

            return {
                loan,
                assignedToReservation,
                reservationInfo
            };
        } catch (error: any) {
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

            this.logger.log(`Loan stats for user ${userId}:`, stats);
            return stats;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene TODOS los préstamos del sistema (Admin only)
     */
    async getAllLoans(): Promise<Loan[]> {
        try {
            const loans = await this.loanModel
                .find()
                .populate('bookId')
                .populate('userId')
                .sort({ loanDate: -1 })
                .exec();

            this.logger.log(`Retrieved ${loans.length} total loans`);
            return loans;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Obtiene préstamos de alto riesgo revisados/no revisados
     */
    async getHighRiskLoans(reviewed?: boolean): Promise<HighRiskLoan[]> {
        try {
            const filter: any = {};
            if (reviewed !== undefined) {
                filter.reviewed = reviewed;
            }

            const highRiskLoans = await this.highRiskLoanModel
                .find(filter)
                .populate('loanId')
                .populate('userId')
                .sort({ riskScore: -1 })
                .exec();

            return highRiskLoans;
        } catch (error: any) {
            throw new InternalServerErrorException(error.message);
        }
    }

    /**
     * Marca una alerta como revisada
     */
    async reviewHighRiskLoan(
        alertId: string,
        adminNotes: string
    ): Promise<HighRiskLoan> {
        try {
            const alert = await this.highRiskLoanModel.findByIdAndUpdate(
                alertId,
                {
                    reviewed: true,
                    reviewedAt: new Date(),
                    adminNotes,
                },
                { new: true }
            );

            if (!alert) {
                throw new NotFoundException('High risk alert not found');
            }

            return alert;
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(error.message);
        }
    }
}