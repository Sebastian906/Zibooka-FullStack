import { ReservationSchema } from "../schemas/reservation.schema";

/**
 * Middleware para auto-calcular expiresAt
 */
export function setupReservationMiddleware() {
    // Pre-save: calcular expiresAt si no existe
    ReservationSchema.pre('save', function (this: any, next: (err?: any) => void) {
        if (!this.expiresAt && this.requestDate) {
            const expiresAt = new Date(this.requestDate);
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 días para reclamar
            this.expiresAt = expiresAt;
            console.log(`[Reservation Middleware] Auto-calculated expiresAt: ${expiresAt.toISOString()}`);
        }
        next();
    });

    // Pre-save: validar que expiresAt sea posterior a requestDate
    ReservationSchema.pre('save', function (this: any, next: (err?: any) => void) {
        if (this.expiresAt && this.requestDate && this.expiresAt <= this.requestDate) {
            next(new Error('Expiration date must be after request date'));
        } else {
            next();
        }
    });
}