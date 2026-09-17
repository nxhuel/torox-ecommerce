import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend | undefined;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY || 're_eghKDyoR_E6J2BGrpP1bQe2gmJ8aTv4vw';
    this.resend = apiKey.startsWith('re_') ? new Resend(apiKey) : undefined;
    this.from = configService.get<string>('MAIL_FROM') || process.env.MAIL_FROM || 'toroxseguridad@gmail.com';
  }

  private async sendEmailInternal(email: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email to ' + email);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to: email, subject, html });
      this.logger.log(`Email sent to ${email}: ${subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
    }
  }

  async sendOrderConfirmation(email: string, orderNumber: string, total: number): Promise<void> {
    await this.sendEmailInternal(email, `Pedido ${orderNumber} - TOROX`, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">¡Gracias por tu compra en TOROX!</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> ha sido registrado.</p>
            <p><strong>Total:</strong> $${total.toLocaleString('es-AR')}</p>
            <p>Estamos preparando tu pedido. Te enviaremos una actualización cuando salga de envío.</p>
            <p>¡Gracias por elegir TOROX!</p>
          </div>
        `);
  }

  async sendPaymentApproved(email: string, orderNumber: string, total: number): Promise<void> {
    await this.sendEmailInternal(email, `Pago aprobado - Pedido ${orderNumber}`, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">¡Pago aprobado!</h1>
            <p>Tu pago de <strong>$${total.toLocaleString('es-AR')}</strong> para el pedido <strong>${orderNumber}</strong> fue aprobado.</p>
            <p>Tu pedido está siendo preparando para el envío.</p>
            <p>¡Gracias por tu compra!</p>
          </div>
        `);
  }

  async sendShipmentStatus(email: string, orderNumber: string, trackingNumber: string): Promise<void> {
    await this.sendEmailInternal(email, `Tu pedido ${orderNumber} fue enviado`, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">📦 Pedido en camino!</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> fue despachado.</p>
            <p><strong>Código de seguimiento:</strong> ${trackingNumber}</p>
            <p>Podés rastrear tu pedido en el apartado <em>"Mis pedidos"</em>.</p>
          </div>
        `);
  }

  async sendOrderDelivered(email: string, orderNumber: string): Promise<void> {
    await this.sendEmailInternal(email, `Pedido entregado - ${orderNumber}`, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">✅ Pedido entregado</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> fue entregado.</p>
            <p>¡Gracias por comprar en TOROX! Esperamos verte de nuevo.</p>
          </div>
        `);
  }

  async sendPaymentRejected(email: string, orderNumber: string, reason: string): Promise<void> {
    await this.sendEmailInternal(email, `Pago rechazado - Pedido ${orderNumber}`, `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Pago rechazado</h1>
            <p>Lamentablemente, el pago de tu pedido <strong>${orderNumber}</strong> no pudo ser procesado.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Podés volver a intentar en la sección <em>"Mis pedidos"</em>.</p>
          </div>
        `);
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'https://torox.com.ar')}/auth/reset-password?token=${resetToken}`;
    await this.sendEmailInternal(email, 'Recuperá tu contraseña - TOROX', `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Recuperá tu contraseña</h1>
            <p>Recibiste este correo porque solicitaste restablecer tu contraseña en TOROX.</p>
            <p>Hacé click en el siguiente botón para crear una nueva contraseña:</p>
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Crear nueva contraseña</a>
            <p style="color: #6b7280; font-size: 14px;">Si no solicitaste esto, podés ignorar este correo.</p>
          </div>
        `);
  }

  async sendEmail(email: string, subject: string, html: string): Promise<void> {
    await this.sendEmailInternal(email, subject, html);
  }
}
