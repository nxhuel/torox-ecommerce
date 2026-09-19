import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';

interface MercadoPagoWebhookNotification {
  id: string;
  type?: number | string;
  action?: string;
  data?: {
    id: number | string;
  };
}

@Controller('webhooks')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly paymentsService: PaymentsService,
    private readonly orderService: OrdersService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Headers('content-type') contentType: string,
  ) {
    this.logger.log(`Webhook received - requestId: ${requestId}`);

    let notification: MercadoPagoWebhookNotification;
    try {
      notification = this.parseNotification(body);
    } catch (error) {
      this.logger.error('Error parseando el body del webhook', error);
      return { received: false, error: 'Body inválido' };
    }

    const paymentId = notification.data?.id?.toString();
    if (!paymentId) {
      this.logger.error('Webhook sin data.id');
      return { received: false, error: 'Falta data.id' };
    }

    try {
      // Validar firma si está configurado (MERCADO_PAGO_WEBHOOK_TOKEN)
      if (this.mercadoPagoService.isWebhookConfigured()) {
        const isValid = this.mercadoPagoService.validateWebhookSignature(
          signature || '',
          requestId || '',
          paymentId,
        );
        if (!isValid) {
          this.logger.warn('Firma de webhook inválida - posible ataque');
          throw new BadRequestException('Firma inválida');
        }
        this.logger.log('Firma de webhook válida');
      } else {
        this.logger.warn('MERCADO_PAGO_WEBHOOK_TOKEN no configurado - saltando validación de firma');
      }

      // Determinar si es un evento de pago
      const typeStr = notification.type != null ? String(notification.type) : '';
      const actionStr = notification.action || '';
      const isPaymentEvent =
        typeStr === '1' ||
        typeStr === '2' ||
        typeStr.includes('payment') ||
        actionStr.includes('payment');

      this.logger.log(`Notification type=${notification.type} action=${actionStr} isPayment=${isPaymentEvent}`);

      if (isPaymentEvent) {
        await this.processPaymentNotification(paymentId);
      }

      return { received: true, eventId: requestId };
    } catch (error: any) {
      this.logger.error(`Webhook error: ${error?.message}`, error?.stack);
      return { received: false, error: error?.message };
    }
  }

  private parseNotification(body: any): MercadoPagoWebhookNotification {
    if (typeof body === 'string') {
      return JSON.parse(body) as MercadoPagoWebhookNotification;
    }
    return body as MercadoPagoWebhookNotification;
  }

  private async processPaymentNotification(paymentId: string) {
    this.logger.log(`Processing payment notification: ${paymentId}`);

    try {
      // Obtener los detalles del pago por su ID real
      const mpPayment = await this.mercadoPagoService.getPaymentById(paymentId);
      const orderId = mpPayment?.external_reference;

      if (!orderId) {
        this.logger.warn(`Payment ${paymentId} sin external_reference (orderId)`);
        return;
      }

      this.logger.log(`Found order ${orderId} for payment ${paymentId}`);
      await this.processOrderPayment(orderId, mpPayment);
    } catch (error: any) {
      this.logger.error(`Error procesando notificación de pago: ${error?.message}`);
    }
  }

  private async processOrderPayment(orderId: string, mpPayment: any) {
    try {
      const payment = await this.paymentsService.findByOrder(orderId);
      if (!payment) {
        this.logger.warn(`No se encontró pago para el order ${orderId}`);
        return;
      }

      if (payment.status === 'APPROVED') {
        this.logger.log(`Order ${orderId} ya está aprobado`);
        return;
      }

      // Verificar estado del pago en MercadoPago
      const mpStatus = mpPayment.status;
      this.logger.log(`MercadoPago payment status: ${mpStatus}`);

      if (mpStatus === 'approved') {
        // Actualizar orden y notificar
        await this.orderService.approvePayment(orderId);
        this.logger.log(`Order ${orderId} approved via webhook`);
      } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        // Rechazar pago
        await this.paymentsService.reject(payment.id, 'Pago rechazado por MercadoPago');
        this.logger.log(`Order ${orderId} rejected via webhook`);
      } else {
        this.logger.log(`Payment ${mpPayment.id} status: ${mpStatus} - waiting...`);
      }
    } catch (error: any) {
      this.logger.error(`Error procesando order ${orderId}: ${error?.message}`);
    }
  }
}