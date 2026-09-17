import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not defined');
    this.resend = new Resend(apiKey);
    this.from = configService.get<string>('MAIL_FROM') || process.env.MAIL_FROM || 'toroxseguridad@gmail.com';
  }

  async sendOrderConfirmation(email: string, orderNumber: string, total: number): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Pedido ${orderNumber} - TOROX`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">¡Gracias por tu compra en TOROX!</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> ha sido registrado.</p>
            <p><strong>Total:</strong> $${total.toLocaleString('es-AR')}</p>
            <p>Estamos preparando tu pedido. Te enviaremos una actualización cuando salga de envío.</p>
            <p>¡Gracias por elegir TOROX!</p>
          </div>
        `,
      });
      this.logger.log(`Order confirmation email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send order confirmation to ${email}: ${error.message}`);
    }
  }

  async sendPaymentApproved(email: string, orderNumber: string, total: number): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Pago aprobado - Pedido ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">¡Pago aprobado!</h1>
            <p>Tu pago de <strong>$${total.toLocaleString('es-AR')}</strong> para el pedido <strong>${orderNumber}</strong> fue aprobado.</p>
            <p>Tu pedido está siendo preparando para el envío.</p>
            <p>¡Gracias por tu compra!</p>
          </div>
        `,
      });
      this.logger.log(`Payment approved email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send payment approved email to ${email}: ${error.message}`);
    }
  }

  async sendShipmentStatus(email: string, orderNumber: string, trackingNumber: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Tu pedido ${orderNumber} fue enviado`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">📦 Pedido en camino!</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> fue despachado.</p>
            <p><strong>Código de seguimiento:</strong> ${trackingNumber}</p>
            <p>Podés rastrear tu pedido en el apartado <em>"Mis pedidos"</em>.</p>
          </div>
        `,
      });
      this.logger.log(`Shipment email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send shipment email to ${email}: ${error.message}`);
    }
  }

  async sendOrderDelivered(email: string, orderNumber: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Pedido entregado - ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">✅ Pedido entregado</h1>
            <p>Tu pedido <strong>${orderNumber}</strong> fue entregado.</p>
            <p>¡Gracias por comprar en TOROX! Esperamos verte de nuevo.</p>
          </div>
        `,
      });
      this.logger.log(`Delivered email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send delivered email to ${email}: ${error.message}`);
    }
  }

  async sendPaymentRejected(email: string, orderNumber: string, reason: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Pago rechazado - Pedido ${orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">⚠️ Pago rechazado</h1>
            <p>Lamentablemente, el pago de tu pedido <strong>${orderNumber}</strong> no pudo ser procesado.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Podés volver a intentar en la sección <em>"Mis pedidos"</em>.</p>
          </div>
        `,
      });
      this.logger.log(`Payment rejected email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send payment rejected email to ${email}: ${error.message}`);
    }
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    try {
      const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'https://torox.com.ar')}/auth/recuperar?token=${resetToken}`;
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'Recuperá tu contraseña - TOROX',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Recuperá tu contraseña</h1>
            <p>Recibiste este correo porque solicitaste restablecer tu contraseña en TOROX.</p>
            <p>Hacé click en el siguiente botón para crear una nueva contraseña:</p>
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Crear nueva contraseña</a>
            <p style="color: #6b7280; font-size: 14px;">Si no solicitaste esto, podés ignorar este correo.</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
    }
  }

  async sendEmail(email: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${email}: ${subject}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
    }
  }
}
