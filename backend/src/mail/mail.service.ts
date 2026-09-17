import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/** Brand colours, kept in sync with the Tailwind theme on the storefront. */
const BRAND_600 = '#0074c5';
const BRAND_700 = '#015da0';
const BRAND_900 = '#0b416d';
const SLATE_900 = '#0f172a';
const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';

const FONT_STACK =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface EmailLayoutOptions {
  /** Hidden preview text shown next to the subject in most inboxes. */
  preheader: string;
  heading: string;
  /** Inner HTML rendered inside the card body, below the heading. */
  content: string;
}

@Injectable()
export class MailService {
  private readonly resend: Resend | undefined;
  private readonly from: string;
  private readonly replyTo: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY || 're_eghKDyoR_E6J2BGrpP1bQe2gmJ8aTv4vw';
    this.resend = apiKey.startsWith('re_') ? new Resend(apiKey) : undefined;
    // Resend only accepts senders from a domain verified in the account, so this
    // must be an address at torox.com.ar (not a free mailbox provider).
    this.from = configService.get<string>('MAIL_FROM') || process.env.MAIL_FROM || 'TOROX <no-reply@torox.com.ar>';
    // The sender is a no-reply address, so replies go to a mailbox someone
    // actually reads. Set MAIL_REPLY_TO to "" to disable the header.
    this.replyTo =
      configService.get<string>('MAIL_REPLY_TO') ?? process.env.MAIL_REPLY_TO ?? 'toroxseguridad@gmail.com';
  }

  /** Storefront origin used for links and the hosted logo, never with a trailing slash. */
  private get baseUrl(): string {
    return (this.configService.get<string>('FRONTEND_URL') || 'https://torox.com.ar')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }

  /** Escapes user-supplied values (names, order notes...) before they reach the HTML. */
  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Shared branded shell so every transactional email looks the same: gradient
   * accent bar, logo header, white card, muted footer.
   */
  private renderLayout({ preheader, heading, content }: EmailLayoutOptions): string {
    const year = new Date().getFullYear();
    const logoUrl = `${this.baseUrl}/logo.png`;

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${this.escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
    <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${this.escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08),0 12px 32px rgba(15,23,42,0.06);">
            <tr>
              <td style="height:4px;background-color:${BRAND_700};background-image:linear-gradient(90deg,${BRAND_700} 0%,${BRAND_600} 55%,#22d3ee 100%);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:26px 32px;border-bottom:1px solid #e2e8f0;">
                <img src="${logoUrl}" alt="TOROX" height="38" style="display:block;height:38px;width:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${SLATE_900};">${heading}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:20px;color:${SLATE_400};">
                  TOROX Seguridad &middot; <a href="${this.baseUrl}" style="color:${BRAND_600};text-decoration:none;">torox.com.ar</a><br />
                  &copy; ${year} TOROX. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  /** Muted callout box used for "if this wasn't you" style notes. */
  private renderNote(html: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">
      <tr>
        <td style="background-color:#f8fafc;border-left:3px solid ${BRAND_600};border-radius:0 8px 8px 0;padding:14px 18px;">
          <p style="margin:0;font-size:13px;line-height:20px;color:${SLATE_500};">${html}</p>
        </td>
      </tr>
    </table>`;
  }

  private paragraph(html: string): string {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${SLATE_500};">${html}</p>`;
  }

  private async sendEmailInternal(
    email: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email to ' + email);
      return false;
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      });
      // The Resend SDK resolves with { data, error } instead of throwing on API
      // errors (unverified sender domain, revoked API key, ...). Ignoring the
      // error here would silently drop every mail while still reporting success.
      if (error) {
        this.logger.error(
          `Failed to send email to ${email}: [${error.name}] ${error.message} (from: ${this.from})`,
        );
        return false;
      }
      this.logger.log(`Email sent to ${email} (id: ${data?.id}): ${subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      return false;
    }
  }

  /** Step 1 of the password reset: the 6-digit verification code. */
  async sendPasswordResetCode(
    email: string,
    firstName: string,
    code: string,
    ttlMinutes: number,
  ): Promise<boolean> {
    const name = this.escapeHtml(firstName || '');
    const greeting = name ? `Hola ${name} 👋` : 'Hola 👋';

    const content = [
      this.paragraph(`${greeting}`),
      this.paragraph(
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en TOROX. Ingresá este código en la web para continuar:',
      ),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td align="center" style="background-color:#f0f7ff;border:1px dashed #7cc8fb;border-radius:12px;padding:24px 16px 24px 28px;">
            <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:38px;line-height:46px;font-weight:700;letter-spacing:12px;color:${BRAND_900};white-space:nowrap;">${this.escapeHtml(code)}</div>
          </td>
        </tr>
      </table>`,
      this.paragraph(
        `El código vence en <strong style="color:${SLATE_900};">${ttlMinutes} minutos</strong> y sirve una sola vez.`,
      ),
      this.renderNote(
        '<strong style="color:#334155;">¿No fuiste vos?</strong> Ignorá este correo: tu contraseña sigue siendo la misma y nadie puede cambiarla sin este código. Si tenés dudas, respondé este mail y te ayudamos.',
      ),
    ].join('');

    const html = this.renderLayout({
      preheader: `Tu código de recuperación es ${code} (vence en ${ttlMinutes} minutos)`,
      heading: 'Recuperá tu contraseña',
      content,
    });

    const text = [
      greeting,
      '',
      'Recibimos una solicitud para restablecer la contraseña de tu cuenta en TOROX.',
      '',
      `Tu código: ${code}`,
      '',
      `Vence en ${ttlMinutes} minutos y sirve una sola vez.`,
      '',
      'Si no fuiste vos, ignorá este correo: tu contraseña sigue siendo la misma.',
      'Si tenés dudas, respondé este mail y te ayudamos.',
      '',
      `TOROX Seguridad - ${this.baseUrl}`,
    ].join('\n');

    return this.sendEmailInternal(email, `${code} es tu código de TOROX`, html, text);
  }

  /** Confirmation sent after the password was actually changed. */
  async sendPasswordChanged(email: string, firstName: string): Promise<boolean> {
    const name = this.escapeHtml(firstName || '');
    const greeting = name ? `Hola ${name},` : 'Hola,';

    const content = [
      this.paragraph(`${greeting}`),
      this.paragraph(
        'Te confirmamos que la contraseña de tu cuenta en TOROX fue actualizada correctamente.',
      ),
      this.paragraph(
        `Ya podés iniciar sesión con tu nueva contraseña desde <a href="${this.baseUrl}/auth/login" style="color:${BRAND_600};font-weight:600;text-decoration:none;">torox.com.ar</a>.`,
      ),
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
        <tr>
          <td style="background-color:${BRAND_700};border-radius:8px;">
            <a href="${this.baseUrl}/auth/login" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Iniciar sesión</a>
          </td>
        </tr>
      </table>`,
      this.renderNote(
        'Si no reconocés este cambio, escribinos cuanto antes respondiendo este correo para que podamos asegurar tu cuenta.',
      ),
    ].join('');

    const html = this.renderLayout({
      preheader: 'Tu contraseña de TOROX fue actualizada',
      heading: 'Contraseña actualizada',
      content,
    });

    const text = [
      greeting,
      '',
      'Te confirmamos que la contraseña de tu cuenta en TOROX fue actualizada correctamente.',
      '',
      `Iniciá sesión: ${this.baseUrl}/auth/login`,
      '',
      'Si no reconocés este cambio, escribinos respondiendo este correo.',
      '',
      `TOROX Seguridad - ${this.baseUrl}`,
    ].join('\n');

    return this.sendEmailInternal(email, 'Contraseña actualizada - TOROX', html, text);
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

  async sendEmail(email: string, subject: string, html: string): Promise<void> {
    await this.sendEmailInternal(email, subject, html);
  }
}
