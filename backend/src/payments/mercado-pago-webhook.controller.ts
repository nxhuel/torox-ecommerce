import {
  Controller,
  Post,
  Body,
  Headers,
  Query,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { MercadoPagoService } from './mercado-pago.service';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { MercadoPagoSyncService } from './mercado-pago-sync.service';

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
    private readonly sync: MercadoPagoSyncService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Headers('content-type') contentType: string,
    @Query('data.id') dataIdQuery: string,
    @Query('type') typeQuery: string,
  ) {
    this.logger.log(`Webhook received - requestId: ${requestId}`);

    let notification: MercadoPagoWebhookNotification;
    try {
      notification = this.parseNotification(body);
    } catch (error) {
      this.logger.error('Error parseando el body del webhook', error);
      return { received: false, error: 'Body inválido' };
    }

    // El data.id puede llegar en el query param (?data.id=...) o en el body.
    // MercadoPago firma usando el valor del query param.
    const paymentId = dataIdQuery || notification.data?.id?.toString() || '';
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

      // Determinar si es un evento de pago (el type puede llegar en query o en body)
      const typeStr = notification.type != null ? String(notification.type) : typeQuery || '';
      const actionStr = notification.action || '';
      const isPaymentEvent =
        typeStr === '1' ||
        typeStr === '2' ||
        typeStr.includes('payment') ||
        actionStr.includes('payment');

      this.logger.log(`Notification type=${typeStr} action=${actionStr} isPayment=${isPaymentEvent}`);

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
      const result = await this.sync.applyPayment(orderId, mpPayment);
      this.logger.log(`Webhook MP → pedido ${orderId}: ${result}`);
    } catch (error: any) {
      this.logger.error(`Error procesando order ${orderId}: ${error?.message}`);
    }
  }
}