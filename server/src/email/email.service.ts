import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private transporterReady: Promise<void>;

    constructor(private configService: ConfigService) {
        this.transporterReady = this.setupTransporter();
    }

    private async setupTransporter(): Promise<void> {
        const host = this.configService.get<string>('EMAIL_HOST') || 'smtp.gmail.com';
        const port = this.configService.get<number>('EMAIL_PORT') || 587;

        const forceSmtp =
            this.configService.get<string>('EMAIL_FORCE_SMTP') === 'true' ||
            this.configService.get<boolean>('EMAIL_FORCE_SMTP') === true;

        // Safe debug: log presence of SMTP env vars (do NOT log the password value)
        const user = this.configService.get<string>('EMAIL_USER');
        const pass = this.configService.get<string>('EMAIL_PASS');
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

            try {
                await this.transporter.verify();
                console.log('[EmailService] SMTP transporter configured.');
                return; // verified, use configured transporter
            } catch (err) {
                console.error('[EmailService] SMTP verify failed:', err);
                if (forceSmtp) {
                    console.error('[EmailService] EMAIL_FORCE_SMTP is enabled — aborting instead of falling back to Ethereal.');
                    throw err;
                }
                console.log('[EmailService] Falling back to Ethereal test account for local testing.');
                // continue to create test account as fallback
            }
        }

        // Fallback: use Ethereal test account for local development
        try {
            const testAccount = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });

            console.log('[EmailService] No SMTP credentials found — using Ethereal test account for email testing.');
            console.log(`[EmailService] Ethereal account user: ${testAccount.user}`);
        } catch (err) {
            console.error('[EmailService] Failed to create Ethereal test account:', err);
            throw err;
        }
    }

    // Envía email de recuperación de contraseña
    async sendPasswordResetEmail(
        email: string,
        resetToken: string,
        userName: string,
    ): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
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
                        .header h1 {
                            margin: 0;
                            color: #2e3031;
                            font-size: 28px;
                        }
                        .header .brand {
                            color: #ac81fd;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .content h2 {
                            color: #2e3031;
                            font-size: 24px;
                            margin-top: 0;
                        }
                        .content p {
                            color: #7b7b7b;
                            font-size: 14px;
                            margin: 16px 0;
                        }
                        .button-container {
                            text-align: center;
                            margin: 30px 0;
                        }
                        .reset-button {
                            display: inline-block;
                            background-color: #ac81fd;
                            color: white !important;
                            text-decoration: none;
                            padding: 14px 40px;
                            border-radius: 50px;
                            font-weight: 500;
                            font-size: 14px;
                            transition: background-color 0.3s;
                        }
                        .reset-button:hover {
                            background-color: #9a6eeb;
                        }
                        .info-box {
                            background-color: #e7f2f3;
                            border-left: 4px solid #ac81fd;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .info-box p {
                            margin: 0;
                            color: #2e3031;
                            font-size: 13px;
                        }
                        .footer {
                            background-color: #f5f5f5;
                            padding: 20px 30px;
                            text-align: center;
                            color: #7b7b7b;
                            font-size: 12px;
                        }
                        .link {
                            color: #ac81fd;
                            text-decoration: none;
                            word-break: break-all;
                        }
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
                            
                            <p>If you have any questions or need help, feel free to contact our support team.</p>
                            
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
            await this.transporterReady;
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password reset email sent to: ${email}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EmailService] Preview URL: ${previewUrl}`);
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
                        .header h1 {
                            margin: 0;
                            color: #2e3031;
                            font-size: 28px;
                        }
                        .header .brand {
                            color: #ac81fd;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .content h2 {
                            color: #2e3031;
                            font-size: 24px;
                            margin-top: 0;
                        }
                        .content p {
                            color: #7b7b7b;
                            font-size: 14px;
                            margin: 16px 0;
                        }
                        .success-icon {
                            text-align: center;
                            font-size: 48px;
                            color: #4CAF50;
                            margin: 20px 0;
                        }
                        .warning-box {
                            background-color: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 16px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .warning-box p {
                            margin: 0;
                            color: #856404;
                            font-size: 13px;
                        }
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
                            
                            <p>For your security, we recommend:</p>
                            <ul>
                                <li>Using a strong, unique password</li>
                                <li>Not sharing your password with anyone</li>
                                <li>Changing your password regularly</li>
                            </ul>
                            
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
            await this.transporterReady;
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Password changed confirmation sent to: ${email}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EmailService] Preview URL: ${previewUrl}`);
        } catch (error) {
            console.error('[EmailService] Error sending confirmation email:', error);
        }
    }
}
