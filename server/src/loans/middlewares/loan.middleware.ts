import { LoanSchema } from "../schemas/loan.schema";

/**
 * Middleware para auto-calcular dueDate
 */
export function setupLoanMiddleware() {
    // Pre-save: calcular dueDate si no existe (synchronous hook, no next)
    LoanSchema.pre('save', function () {
        const doc: any = this;
        if (!doc.dueDate && doc.loanDate) {
            const dueDate = new Date(doc.loanDate);
            dueDate.setDate(dueDate.getDate() + 15); // 15 días de préstamo
            doc.dueDate = dueDate;
            console.log(`[Loan Middleware] Auto-calculated dueDate: ${dueDate.toISOString()}`);
        }
    });

    // Pre-save: validar que dueDate sea posterior a loanDate (synchronous hook)
    LoanSchema.pre('save', function () {
        const doc: any = this;
        if (doc.dueDate && doc.loanDate && doc.dueDate <= doc.loanDate) {
            throw new Error('Due date must be after loan date');
        }
    });

    // Pre-save: calcular lateFee si está vencido (synchronous hook)
    LoanSchema.pre('save', function () {
        const doc: any = this;
        if (doc.status === 'overdue' && doc.dueDate) {
            const today = new Date();
            const daysLate = Math.floor(
                (today.getTime() - doc.dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysLate > 0) {
                doc.lateFee = daysLate * 0.5; // $0.50 por día de retraso
                console.log(`[Loan Middleware] Calculated late fee: $${doc.lateFee} (${daysLate} days late)`);
            }
        }
    });
}