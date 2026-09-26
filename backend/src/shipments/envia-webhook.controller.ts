import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ShipmentsService } from './shipments.service';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import {
  ENVIA_EVENT_HEADER,
  ENVIA_ID_HEADER,
  ENVIA_SIGNATURE_HEADER,
  ENVIA_TIMESTAMP_HEADER,
  verifyEnviaSignature,
} from './webhook-signature';

/**
 * Webhook de Envia.com.
 *
 * Registrar la URL en el dashboard/API de Envia:
 *   POST https://queries.envia.com/webhooks
 *   { "type_id": 4, "url": "https://<dominio>/api/webhooks/envia", "active": 1 }
 *
 * Los tipos firmados (3 "tracking.simple", 4 "ecommerceTracking" y 5 "surcharge") envían
 * los headers `X-Webhook-Event`, `X-Webhook-Id`, `X-Webhook-Timestamp` y
 * `X-Webhook-Signature: v1=HMAC(ts + "." + event + "." + body_json, secret)`.
 * El secret es el `auth_token` del webhook y se configura en `ENVIA_WEBHOOK_SECRET`.
 *
 * Payload de tracking (type_id 3 / 4):
 * {
 *   "type": "tracking.simple",
 *   "created_at": "2026-01-01T00:00:00.000Z",
 *   "data": {
 *     "shipment_id": 98765,
 *     "tracking_number": "1Z999...",
 *     "carrier_name": "Correo Argentino",
 *     "status": "delivered",
 *     "status_description": "Package delivered",
 *     "location": "Cordoba, AR"
 *   }
 * }
 */
@Controller('webhooks')
export class EnviaWebhookController {
  private readonly logger = new Logger(EnviaWebhookController.name);

  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly config: ConfigService,
    private readonly idempotency: WebhookIdempotencyService,
  ) {}

  @Post('envia')
  @HttpCode(HttpStatus.OK)
  async handleEnviaWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
  ) {
    const signature = verifyEnviaSignature({
      secret: this.config.get<string>('ENVIA_WEBHOOK_SECRET'),
      rawBody: req.rawBody?.toString('utf8'),
      signature: header(headers, ENVIA_SIGNATURE_HEADER),
      timestamp: header(headers, ENVIA_TIMESTAMP_HEADER),
      event: header(headers, ENVIA_EVENT_HEADER),
    });

    if (signature.status === 'invalid') {
      this.logger.warn(`Webhook Envia rechazado: ${signature.reason}`);
      throw new UnauthorizedException('Firma de webhook inválida');
    }
    if (signature.status === 'skipped') {
      this.logger.warn(`Webhook Envia sin verificar la firma: ${signature.reason}`);
    }

    // Soportamos tanto el payload nuevo (data.*) como el legacy (raíz).
    const data = body?.data ?? body ?? {};
    const trackingNumber: string | undefined = data.tracking_number || data.trackingNumber;
    const status: string | undefined = data.status;
    const description: string | undefined = data.status_description;

    if (!trackingNumber || !status) {
      this.logger.warn(`Webhook Envia con datos incompletos: ${JSON.stringify(body)}`);
      return { received: false, error: 'Faltan tracking_number o status' };
    }

    const deliveryId = header(headers, ENVIA_ID_HEADER);
    if (!this.idempotency.claim(deliveryId)) {
      this.logger.log(`Webhook Envia duplicado, se ignora (X-Webhook-Id=${deliveryId})`);
      return { received: true, duplicate: true };
    }

    this.logger.log(
      `Webhook Envia: tracking=${trackingNumber} status=${status}${description ? ` (${description})` : ''}`,
    );

    try {
      await this.shipmentsService.handleTrackingWebhook(trackingNumber, status, description);
      return { received: true };
    } catch (error: any) {
      // Liberamos el id para que un reintento pueda procesarse y respondemos 200 igual,
      // así Envia no entra en loop de reintentos por un error nuestro.
      this.idempotency.release(deliveryId);
      this.logger.error(`Error procesando webhook Envia: ${error?.message}`, error?.stack);
      return { received: true };
    }
  }
}

/** Express lowercases header names and may hand back an array when the header repeats. */
function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
