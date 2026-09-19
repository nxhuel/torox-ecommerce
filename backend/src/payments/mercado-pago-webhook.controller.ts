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
  type: number;
  data: {
    id: number;
    authorized_payment?: {
      id: number;
    };
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

    try {
      // Validar content-type
      if (!contentType?.includes('application/json')) {
        throw new BadRequestException('Content-Type must be application/json');
      }

      // Validar firma si está configurado (opcional por ahora)
      // Para habilitar: configurar MERCADO_PAGO_WEBHOOK_TOKEN en .env
      const signatureStr = signature || '';
      if (signatureStr && this.mercadoPagoService.validateWebhookSignature) {
        const isValid = this.mercadoPagoService.validateWebhookSignature(
          JSON.stringify(body),
          signatureStr,
        );
        if (!isValid) {
          this.logger.warn('Firma de webhook inválida - posible ataque');
          throw new BadRequestException('Firma inválida');
        }
      }

      // Parsear notificación
      const notification = this.parseNotification(body);
      this.logger.log(`Processing notification type: ${notification.type}, id: ${notification.id}`);

      // Procesar según tipo de evento
      // Type 1 = payment.created / payment.authorized
      // Type 2 = payment.updated
      if (notification.type === 1 || notification.type === 2) {
        await this.processPaymentNotification(notification);
      }

      // Return 200 OK to acknowledge receipt
      return { received: true, eventId: requestId };
    } catch (error: any) {
      this.logger.error(`Webhook error: ${error?.message}`, error?.stack);
      // No re-throw para no causar retries en MercadoPago
      // Pero registramos el error
      return { received: false, error: error?.message };
    }
  }

  private parseNotification(body: any): MercadoPagoWebhookNotification {
    try {
      if (typeof body === 'string') {
        return JSON.parse(body) as MercadoPagoWebhookNotification;
      }
      return body as MercadoPagoWebhookNotification;
    } catch (error) {
      this.logger.error('Error parseando body del webhook:', error);
      throw new BadRequestException('Body inválido');
    }
  }

  private async processPaymentNotification(notification: MercadoPagoWebhookNotification) {
    const paymentId = notification.data.id;
    this.logger.log(`Processing payment notification: ${paymentId}`);

    try {
      // Obtener detalles del pago desde MercadoPago
      const payments = await this.mercadoPagoService.getPaymentByOrderId(
        notification.data.id.toString(),
      );

      // Buscar el pago que coincide con esta notificación
      for (const mpPayment of payments) {
        const mpPaymentId = mpPayment.id || mpPayment.payment_id;
        const authorizedPaymentId = mpPayment.authorized_payment?.id;

        if (mpPaymentId === paymentId || authorizedPaymentId === paymentId) {
          const orderId = mpPayment.external_reference;
          if (orderId) {
            this.logger.log(`Found order ${orderId} for payment ${paymentId}`);
            await this.processOrderPayment(orderId, mpPayment);
          }
        }
      }
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
      } else if (mpStatus === 'rejected') {
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
