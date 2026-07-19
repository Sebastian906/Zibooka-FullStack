import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
    private transporter!: nodemailer.Transporter;

    constructor(private configService: ConfigService) { }

    // Called by NestJS after dependency injection is complete.
    async onModuleInit(): Promise<void> {
        await this.setupTransporter();
    }

    private async setupTransporter(): Promise<void> {
        const host = this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com';
        const port = this.configService.get<number>('EMAIL_PORT') || 587;
        const user = this.configService.get<string>('EMAIL_USER');
        const pass = this.configService.get<string>('EMAIL_PASS');
        const forceSmtp = this.configService.get<string>('EMAIL_FORCE_SMTP') === 'true';

        console.log('[EmailService] SMTP env presence:', {
            user: !!user,
            pass: !!pass,
            forceSmtp,
        });

        if (user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });

            // SOLO VERIFICAR EN DESARROLLO, NO EN PRODUCCIÓN
            if (!forceSmtp) {
                try {
                    await this.transporter.verify();
                    console.log('[EmailService] SMTP transporter verified and ready.');
                } catch (err) {
                    console.error('[EmailService] SMTP verify failed:', err);
                    console.log('[EmailService] Continuing without verification. Emails will be attempted on-demand.');
                }
            } else {
                console.log('[EmailService] EMAIL_FORCE_SMTP enabled — skipping verification.');
            }
            return;
        }

        // Fallback: Ethereal (solo para testing local)
        try {
            const testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });

            console.log('[EmailService] Using Ethereal test account.');
            console.log(`[EmailService] Ethereal user: ${testAccount.user}`);
        } catch (err) {
            console.error('[EmailService] Failed to create Ethereal account:', err);
            throw err;
        }
    }

    // Envía email de recuperación de contraseña
    async sendPasswordResetEmail(
        email: string,
        resetToken: string,
        userName: string,
    ): Promise<void> {
        const frontendUrl = this.configService.get<string>('VITE_FRONTEND_URL');
        if (!frontendUrl) {
            throw new Error('VITE_FRONTEND_URL is not defined in environment variables');
        }
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `"Zibooka Library" <${this.configService.get<string>('EMAIL_USER')}>`,
            to: email,
            subject: 'Password Reset Request - Zibooka',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Inter', Arial, sans-serif;
                            line-height: 1.6;
                            color: #2e3031;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: white;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            background: linear-gradient(to right, #e7f2f3, white, #e7f2f3);
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 { margin: 0; color: #2e3031; font-size: 28px; }
                        .header .brand { color: #ac81fd; }
                        .content { padding: 40px 30px; }
                        .content h2 { color: #2e3031; font-size: 24px; margin-top: 0; }
                        .content p { color: #7b7b7b; font-size: 14px; margin: 16px 0; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .reset-button {
                            display: inline-block;
                            background-color: #ac81fd;
                            color: white !important;
                            text-decoration: none;
                            padding: 14px 40px;
                            border-radius: 50px;
                            font-weight: 500;
                            font-size: 14px;
                        }
                        .info-box {
                            background-color: #e7f2f3;
                            border-left: 4px solid #ac81fd;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .info-box p { margin: 0; color: #2e3031; font-size: 13px; }
                        .footer {
                            background-color: #f5f5f5;
                            padding: 20px 30px;
                            text-align: center;
                            color: #7b7b7b;
                            font-size: 12px;
                        }
                        .link { color: #ac81fd; text-decoration: none; word-break: break-all; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <div class="content">
                            <h2>Password Reset Request</h2>
                            <p>Hello ${userName},</p>
                            <p>We received a request to reset your password for your Zibooka account. If you didn't make this request, you can safely ignore this email.</p>
                            <div class="button-container">
                                <a href="${resetUrl}" class="reset-button">Reset Password</a>
                            </div>
                            <div class="info-box">
                                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
                            </div>
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p><a href="${resetUrl}" class="link">${resetUrl}</a></p>
                            <p>Best regards,<br>The Zibooka Team</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Zibooka. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password reset email sent to: ${email}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl)
                console.log(`[EmailService] Preview URL: ${previewUrl}`);
        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    // Envía email de confirmación de cambio de contraseña
    async sendPasswordChangedConfirmation(
        email: string,
        userName: string,
    ): Promise<void> {
        const mailOptions = {
            from: `"Zibooka Library" <${this.configService.get<string>('EMAIL_USER')}>`,
            to: email,
            subject: 'Password Changed Successfully - Zibooka',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Inter', Arial, sans-serif;
                            line-height: 1.6;
                            color: #2e3031;
                            background-color: #f5f5f5;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background-color: white;
                            border-radius: 12px;
                            overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            background: linear-gradient(to right, #e7f2f3, white, #e7f2f3);
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 { margin: 0; color: #2e3031; font-size: 28px; }
                        .header .brand { color: #ac81fd; }
                        .content { padding: 40px 30px; }
                        .content h2 { color: #2e3031; font-size: 24px; margin-top: 0; }
                        .content p { color: #7b7b7b; font-size: 14px; margin: 16px 0; }
                        .success-icon { text-align: center; font-size: 48px; color: #4CAF50; margin: 20px 0; }
                        .warning-box {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .warning-box p { margin: 0; color: #856404; font-size: 13px; }
                        .footer {
                            background-color: #f5f5f5;
                            padding: 20px 30px;
                            text-align: center;
                            color: #7b7b7b;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <div class="content">
                            <div class="success-icon">✓</div>
                            <h2>Password Changed Successfully</h2>
                            <p>Hello ${userName},</p>
                            <p>Your password has been changed successfully. You can now log in with your new password.</p>
                            <div class="warning-box">
                                <p><strong>Security Alert:</strong> If you didn't make this change, please contact our support team immediately.</p>
                            </div>
                            <p>Best regards,<br>The Zibooka Team</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Zibooka. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password changed confirmation sent to: ${email}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl)
                console.log(`[EmailService] Preview URL: ${previewUrl}`);
        } catch (error) {
            console.error('[EmailService] Error sending confirmation email:', error);
        }
    }

    // NOTIFICATION EMAILS

    // Envía email genérico (para notificaciones de alto riesgo y otros usos internos)
    async sendGenericEmail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: `"ZiBooka System" <${this.configService.get<string>('EMAIL_USER')}>`,
                to,
                subject,
                html,
            });
            console.log(`[EmailService] Generic email sent to: ${to}`);
            return true;
        } catch (error: any) {
            console.error('[EmailService] Error sending generic email:', error);
            return false;
        }
    }

    // Envía email de recordatorio de préstamo
    async sendLoanReminder(
        toEmail: string,
        userName: string,
        bookTitle: string,
        dueDate: Date,
        daysRemaining: number,
        frontendUrl: string,
    ): Promise<boolean> {
        const formattedDate = dueDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const mailOptions = {
            from: `"ZiBooka Library" <${this.configService.get<string>('EMAIL_USER')}>`,
            to: toEmail,
            subject: `Loan Reminder: "${bookTitle}" due in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} - ZiBooka`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #2e3031; background-color: #f5f5f5; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
                        .header { background: linear-gradient(to right, #e7f2f3, white, #e7f2f3); padding: 30px; text-align: center; }
                        .header h1 { margin: 0; color: #2e3031; font-size: 28px; }
                        .header .brand { color: #ac81fd; }
                        .content { padding: 40px 30px; }
                        .content h2 { color: #2e3031; font-size: 22px; margin-top: 0; }
                        .content p { color: #7b7b7b; font-size: 14px; margin: 16px 0; }
                        .book-info { background-color: #e7f2f3; border-left: 4px solid #ac81fd; padding: 16px; margin: 20px 0; border-radius: 4px; }
                        .book-info p { margin: 4px 0; color: #2e3031; font-size: 13px; }
                        .book-info strong { color: #2e3031; }
                        .urgency { text-align: center; margin: 20px 0; }
                        .urgency .days { font-size: 36px; font-weight: bold; color: ${daysRemaining <= 1 ? '#dc3545' : daysRemaining <= 2 ? '#ffc107' : '#ac81fd'}; }
                        .urgency .label { font-size: 14px; color: #7b7b7b; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .action-button { display: inline-block; background-color: #ac81fd; color: white !important; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-weight: 500; font-size: 14px; }
                        .footer { background-color: #f5f5f5; padding: 20px 30px; text-align: center; color: #7b7b7b; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <div class="content">
                            <h2>Loan Reminder</h2>
                            <p>Hello ${userName},</p>
                            <p>This is a friendly reminder that your book loan is about to expire:</p>
                            <div class="book-info">
                                <p><strong>Book:</strong> ${bookTitle}</p>
                                <p><strong>Due Date:</strong> ${formattedDate}</p>
                            </div>
                            <div class="urgency">
                                <div class="days">${daysRemaining}</div>
                                <div class="label">day${daysRemaining !== 1 ? 's' : ''} remaining</div>
                            </div>
                            <p>Please return the book before the due date to avoid late fees ($0.50 per day).</p>
                            <div class="button-container">
                                <a href="${frontendUrl}/my-loans" class="action-button">View My Loans</a>
                            </div>
                            <p>Best regards,<br>The ZiBooka Team</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} ZiBooka. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Loan reminder sent to: ${toEmail}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EmailService] Preview URL: ${previewUrl}`);
            return true;
        } catch (error: any) {
            console.error('[EmailService] Error sending loan reminder:', error);
            return false;
        }
    }

    // Envía email de recordatorio de reserva
    async sendReservationReminder(
        toEmail: string,
        userName: string,
        bookTitle: string,
        expiresAt: Date,
        daysRemaining: number,
        queuePosition: number,
        frontendUrl: string,
    ): Promise<boolean> {
        const formattedDate = expiresAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const mailOptions = {
            from: `"ZiBooka Library" <${this.configService.get<string>('EMAIL_USER')}>`,
            to: toEmail,
            subject: `Reservation Reminder: "${bookTitle}" expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} - ZiBooka`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #2e3031; background-color: #f5f5f5; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
                        .header { background: linear-gradient(to right, #e7f2f3, white, #e7f2f3); padding: 30px; text-align: center; }
                        .header h1 { margin: 0; color: #2e3031; font-size: 28px; }
                        .header .brand { color: #ac81fd; }
                        .content { padding: 40px 30px; }
                        .content h2 { color: #2e3031; font-size: 22px; margin-top: 0; }
                        .content p { color: #7b7b7b; font-size: 14px; margin: 16px 0; }
                        .book-info { background-color: #e7f2f3; border-left: 4px solid #ac81fd; padding: 16px; margin: 20px 0; border-radius: 4px; }
                        .book-info p { margin: 4px 0; color: #2e3031; font-size: 13px; }
                        .book-info strong { color: #2e3031; }
                        .urgency { text-align: center; margin: 20px 0; }
                        .urgency .days { font-size: 36px; font-weight: bold; color: ${daysRemaining <= 1 ? '#dc3545' : daysRemaining <= 2 ? '#ffc107' : '#ac81fd'}; }
                        .urgency .label { font-size: 14px; color: #7b7b7b; }
                        .button-container { text-align: center; margin: 30px 0; }
                        .action-button { display: inline-block; background-color: #ac81fd; color: white !important; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-weight: 500; font-size: 14px; }
                        .footer { background-color: #f5f5f5; padding: 20px 30px; text-align: center; color: #7b7b7b; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <div class="content">
                            <h2>Reservation Reminder</h2>
                            <p>Hello ${userName},</p>
                            <p>This is a friendly reminder that your book reservation is about to expire:</p>
                            <div class="book-info">
                                <p><strong>Book:</strong> ${bookTitle}</p>
                                <p><strong>Expires:</strong> ${formattedDate}</p>
                                <p><strong>Your Position:</strong> #${queuePosition} in queue</p>
                            </div>
                            <div class="urgency">
                                <div class="days">${daysRemaining}</div>
                                <div class="label">day${daysRemaining !== 1 ? 's' : ''} remaining</div>
                            </div>
                            <p>If the reservation expires, you will need to join the waiting list again.</p>
                            <div class="button-container">
                                <a href="${frontendUrl}/my-reservations" class="action-button">View My Reservations</a>
                            </div>
                            <p>Best regards,<br>The ZiBooka Team</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} ZiBooka. All rights reserved.</p>
                            <p>This is an automated message, please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Reservation reminder sent to: ${toEmail}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EmailService] Preview URL: ${previewUrl}`);
            return true;
        } catch (error: any) {
            console.error('[EmailService] Error sending reservation reminder:', error);
            return false;
        }
    }

    // Envía notificación manual del admin
    async sendAdminNotification(
        toEmail: string,
        toName: string,
        subject: string,
        message: string,
        adminEmail: string,
    ): Promise<boolean> {
        const mailOptions = {
            from: `"ZiBooka Admin" <${this.configService.get<string>('EMAIL_USER')}>`,
            to: toEmail,
            subject: subject || 'Notification from ZiBooka Admin',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #2e3031; background-color: #f5f5f5; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
                        .header { background: linear-gradient(to right, #e7f2f3, white, #e7f2f3); padding: 30px; text-align: center; }
                        .header h1 { margin: 0; color: #2e3031; font-size: 28px; }
                        .header .brand { color: #ac81fd; }
                        .content { padding: 40px 30px; }
                        .content h2 { color: #2e3031; font-size: 22px; margin-top: 0; }
                        .content p { color: #7b7b7b; font-size: 14px; margin: 16px 0; }
                        .message-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px; }
                        .message-box p { margin: 0; color: #2e3031; font-size: 14px; white-space: pre-wrap; }
                        .admin-badge { text-align: center; margin: 15px 0; }
                        .admin-badge span { background-color: #ac81fd; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
                        .footer { background-color: #f5f5f5; padding: 20px 30px; text-align: center; color: #7b7b7b; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ZiBook<span class="brand">a.</span></h1>
                        </div>
                        <div class="content">
                            <div class="admin-badge"><span>Admin Message</span></div>
                            <h2>${subject}</h2>
                            <p>Hello ${toName},</p>
                            <div class="message-box">
                                <p>${message}</p>
                            </div>
                            <p>If you have any questions, please contact us or visit your account for more details.</p>
                            <p>Best regards,<br>The ZiBooka Team</p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} ZiBooka. All rights reserved.</p>
                            <p>Sent by admin: ${adminEmail}</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Admin notification sent to: ${toEmail}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EmailService] Preview URL: ${previewUrl}`);
            return true;
        } catch (error: any) {
            console.error('[EmailService] Error sending admin notification:', error);
            return false;
        }
    }
}
