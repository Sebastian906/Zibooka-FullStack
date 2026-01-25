import { LoanSchema } from "../schemas/loan.schema";

/**
 * Middleware para auto-calcular dueDate
 */
export function setupLoanMiddleware() {
    // Pre-save: calcular dueDate si no existe
    LoanSchema.pre('save', function (this: any, next: (err?: any) => void) {
        if (!this.dueDate && this.loanDate) {
            const dueDate = new Date(this.loanDate);
            dueDate.setDate(dueDate.getDate() + 15); // 15 días de préstamo
            this.dueDate = dueDate;
            console.log(`[Loan Middleware] Auto-calculated dueDate: ${dueDate.toISOString()}`);
        }
        next();
    });

    // Pre-save: validar que dueDate sea posterior a loanDate
    LoanSchema.pre('save', function (this: any, next: (err?: any) => void) {
        if (this.dueDate && this.loanDate && this.dueDate <= this.loanDate) {
            next(new Error('Due date must be after loan date'));
        } else {
            next();
        }
    });

    // Pre-save: calcular lateFee si está vencido
    LoanSchema.pre('save', function (this: any, next: (err?: any) => void) {
        if (this.status === 'overdue' && this.dueDate) {
            const today = new Date();
            const daysLate = Math.floor(
                (today.getTime() - this.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysLate > 0) {
                this.lateFee = daysLate * 0.5; // $0.50 por día de retraso
                console.log(`[Loan Middleware] Calculated late fee: $${this.lateFee} (${daysLate} days late)`);
            }
        }
        next();
    });
}