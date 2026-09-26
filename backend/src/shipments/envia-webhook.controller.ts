import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';

/**
 * Webhook de Envia.com.
 *
 * Registrar la URL en el dashboard/API de Envia:
 *   POST https://queries.envia.com/webhooks
 *   { "type_id": 3, "url": "https://<dominio>/api/webhooks/envia", "active": 1 }
 *
 * Payload de tracking (type_id 3 "simpleTracking" / 4 "ecommerceTracking"):
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

  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('envia')
  @HttpCode(HttpStatus.OK)
  async handleEnviaWebhook(@Body() body: any) {
    // Soportamos tanto el payload nuevo (data.*) como el legacy (raíz).
    const data = body?.data ?? body ?? {};
    const trackingNumber: string | undefined =
      data.tracking_number || data.trackingNumber;
    const status: string | undefined = data.status;
    const description: string | undefined = data.status_description;

    if (!trackingNumber || !status) {
      this.logger.warn(`Webhook Envia con datos incompletos: ${JSON.stringify(body)}`);
      return { received: false, error: 'Faltan tracking_number o status' };
    }

    this.logger.log(
      `Webhook Envia: tracking=${trackingNumber} status=${status}${description ? ` (${description})` : ''}`,
    );

    try {
      await this.shipmentsService.handleTrackingWebhook(trackingNumber, status, description);
      return { received: true };
    } catch (error: any) {
      // Respondemos 200 igual para que Envia no reintente en loop; logueamos el error.
      this.logger.error(`Error procesando webhook Envia: ${error?.message}`, error?.stack);
      return { received: true };
    }
  }
}
