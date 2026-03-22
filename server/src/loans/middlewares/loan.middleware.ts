import { LoanSchema } from "../schemas/loan.schema";

/**
 * Middleware para auto-calcular dueDate
 */
export function setupLoanMiddleware() {
    // Pre-save: calcular dueDate si no existe (synchronous hook, no next)
    LoanSchema.pre('save', function () {
        const loan = this as unknown as {
            dueDate?: Date;
            loanDate?: Date;
            status?: string;
            lateFee?: number;
        };

        if (!loan.dueDate && loan.loanDate) {
            const dueDate = new Date(loan.loanDate);
            dueDate.setDate(dueDate.getDate() + 15); // 15-day loan period
            loan.dueDate = dueDate;
            console.log(`[Loan Middleware] Auto-calculated dueDate: ${dueDate.toISOString()}`);
        }
    });

    // Pre-save: validar que dueDate sea posterior a loanDate (synchronous hook)
    LoanSchema.pre('save', function () {
        const loan = this as unknown as {
            dueDate?: Date;
            loanDate?: Date;
        };

        if (loan.dueDate && loan.loanDate && loan.dueDate <= loan.loanDate) {
            throw new Error('Due date must be after loan date');
        }
    });

    // Pre-save: calcular lateFee si está vencido (synchronous hook)
    LoanSchema.pre('save', function () {
        const loan = this as unknown as {
            status?: string;
            dueDate?: Date;
            lateFee?: number;
        };

        if (loan.status === 'overdue' && loan.dueDate) {
            const today = new Date();
            const daysLate = Math.floor(
                (today.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysLate > 0) {
                loan.lateFee = daysLate * 0.5; // $0.50 per late day
                console.log(`[Loan Middleware] Calculated late fee: $${loan.lateFee} (${daysLate} days late)`);
            }
        }
    });
}