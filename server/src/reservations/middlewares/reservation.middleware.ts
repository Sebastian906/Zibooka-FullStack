import { ReservationSchema } from "../schemas/reservation.schema";

/**
 * Middleware para auto-calcular expiresAt
 */
export function setupReservationMiddleware() {
    // Pre-validate: calcular expiresAt si no existe (synchronous hook)
    // Use 'validate' so the field is set before Mongoose validation runs
    ReservationSchema.pre('validate', function () {
        const doc: any = this;
        if (!doc.expiresAt && doc.requestDate) {
            const expiresAt = new Date(doc.requestDate);
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 días para reclamar
            doc.expiresAt = expiresAt;
            console.log(`[Reservation Middleware] Auto-calculated expiresAt: ${expiresAt.toISOString()}`);
        }
    });

    // Pre-validate: validar que expiresAt sea posterior a requestDate (synchronous)
    // Also run before validation to ensure consistency
    ReservationSchema.pre('validate', function () {
        const doc: any = this;
        if (doc.expiresAt && doc.requestDate && doc.expiresAt <= doc.requestDate) {
            throw new Error('Expiration date must be after request date');
        }
    });
}