import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  ProcessPaymentInput,
  ProcessPaymentResult,
} from './providers/payment-provider.interface';

export interface MercadoPagoPreference {
  site_id: string;
  payer: {
    email: string;
    name?: string;
    surname?: string;
    phone?: { area_code: string; number: string };
    address?: {
      zip_code: string;
      street_name: string;
      street_number: string;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: 'approved' | 'authorized';
  items: Array<{
    id: string;
    title: string;
    description?: string;
    currency_id: string;
    unit_price: number;
    quantity: number;
    picture_url?: string;
  }>;
  notification_url: string;
  external_reference: string;
  marketplace_owner: boolean;
}

export interface MercadoPagoPreferenceResponse {
  body: {
    id: number;
    sandbox_init_point?: string;
    init_point: string;
    preference_id: string;
  };
}

@Injectable()
export class MercadoPagoService implements PaymentProvider {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;
  private readonly publicKey: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookToken: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    this.publicKey = this.config.get<string>('MERCADO_PAGO_PUBLIC_KEY') || '';
    this.clientId = this.config.get<string>('MERCADO_PAGO_CLIENT_ID') || '';
    this.clientSecret = this.config.get<string>('MERCADO_PAGO_CLIENT_SECRET') || '';
    // Webhook token para validar firmas (lo configuras en el dashboard de MP)
    this.webhookToken = this.config.get<string>('MERCADO_PAGO_WEBHOOK_TOKEN') || '';
  }

  /**
   * Creates a MercadoPago preference for Checkout Pro with redirect.
   * This is the main method used in production for the checkout flow.
   */
  async createPreference(
    orderId: string,
    amount: number,
    items: Array<{
      id: string;
      name: string;
      image?: string;
      quantity: number;
      unitPrice: number;
    }>,
    customer: {
      email: string;
      name?: string;
      phone?: string;
    },
    shippingAddress: {
      province: string;
      city: string;
      postalCode: string;
      address: string;
      number?: string;
    } | undefined,
    successUrl: string,
    failureUrl: string,
    pendingUrl: string,
  ): Promise<{ preferenceId: number; initPoint: string }> {
    const preference: MercadoPagoPreference = {
      site_id: 'MLA',
      payer: {
        email: customer.email,
        ...(customer.name && { name: customer.name }),
        phone: customer.phone
          ? { area_code: '011', number: customer.phone.replace(/\D/g, '').slice(4) }
          : undefined,
        ...(shippingAddress && {
          address: {
            zip_code: shippingAddress.postalCode,
            street_name: shippingAddress.address,
            street_number: shippingAddress.number || '0',
          },
        }),
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: 'approved',
      items: items.map((item) => ({
        id: item.id,
        title: item.name,
        description: item.name,
        currency_id: 'ARS',
        unit_price: item.unitPrice,
        quantity: item.quantity,
        ...(item.image && { picture_url: item.image }),
      })),
      notification_url: this.config.get<string>('MERCADO_PAGO_WEBHOOK_URL') || '',
      external_reference: orderId,
      marketplace_owner: true,
    };

    this.logger.log(`Creating MercadoPago preference for order ${orderId}`);

    const response = await firstValueFrom(
      this.http.post<MercadoPagoPreferenceResponse>(
        `${this.baseUrl}/checkout/preferences`,
        preference,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const { id, init_point } = response.data.body;
    this.logger.log(`Preference created: ${id}, init_point: ${init_point}`);

    return { preferenceId: id, initPoint: init_point };
  }

  /**
   * Cancel a preference (for orders that haven't been paid yet)
   */
  async cancelPreference(preferenceId: number): Promise<void> {
    this.logger.log(`Cancelling preference ${preferenceId}`);
    await firstValueFrom(
      this.http.delete(`${this.baseUrl}/checkout/preferences/${preferenceId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }),
    );
  }

  /**
   * Get payment information from MercadoPago by external_reference (orderId)
   */
  async getPaymentByOrderId(orderId: string) {
    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl}/v1/payments/search`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        params: {
          external_reference: orderId,
          limit: 10,
        },
      }),
    );

    return response.data.body.results || [];
  }

  /**
   * Get a single payment from MercadoPago by its payment ID
   */
  async getPaymentById(paymentId: string) {
    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl}/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }),
    );
    return response.data.body ?? response.data;
  }

  /**
   * Process payment - for Checkout Pro this is handled by webhook,
   * but this method returns a pending result that gets updated via webhook
   */
  async processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {
    // For Checkout Pro, we don't process immediately - the webhook will handle it
    // This method is called when creating the order, but we'll return PENDING
    // and the webhook will update the payment status
    return {
      status: 'PENDING',
      reference: `MP-${Date.now()}`,
      message: 'Pago pendiente. Redirigiendo al checkout de MercadoPago...',
    };
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getClientId(): string {
    return this.clientId;
  }

  /**
   * Obtener un access token usando client_id y client_secret
   * Útil para operaciones que requieren autenticación OAuth
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const response = await firstValueFrom(
      this.http.post<{ access_token: string; token_type: string; expires_in: number }>(
        `${this.baseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
      ),
    );

    return response.data.access_token;
  }

  /**
   * Validar la firma de un webhook de MercadoPago
   * @param signature Firma recibida en el header x-signature (formato: ts=...,v1=...)
   * @param requestId Header x-request-id
   * @param notificationId ID de la notificación (data.id del body)
   * @returns true si la firma es válida
   */
  validateWebhookSignature(
    signature: string,
    requestId: string,
    notificationId: string,
  ): boolean {
    if (!this.webhookToken) {
      this.logger.warn('MERCADO_PAGO_WEBHOOK_TOKEN no configurado. Saltando validación de firma.');
      return true; // Si no hay token configurado, aceptamos la solicitud
    }

    try {
      // La firma viene en formato: ts=1234567890,v1=abc123...
      const parts = new Map<string, string>();
      for (const pair of signature.split(',')) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
          parts.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
        }
      }
      const timestamp = parts.get('ts');
      const hash = parts.get('v1');

      if (!timestamp || !hash) {
        this.logger.warn('Firma de webhook inválida: faltan timestamp o hash');
        return false;
      }

      // Generar el manifest según la documentación de MercadoPago:
      // id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;
      // (los valores ausentes se omiten, y data.id se minimiza si es alfanumérico)
      const manifestParts: string[] = [];
      if (notificationId) {
        manifestParts.push(`id:${notificationId.toLowerCase()}`);
      }
      if (requestId) {
        manifestParts.push(`request-id:${requestId}`);
      }
      manifestParts.push(`ts:${timestamp}`);
      const manifest = `${manifestParts.join(';')};`;

      const expectedHash = crypto
        .createHmac('sha256', this.webhookToken)
        .update(manifest)
        .digest('hex');

      if (expectedHash !== hash) {
        this.logger.warn(`Firma inválida: recibida=${hash} esperada=${expectedHash}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Error validando firma del webhook: ${error}`);
      return false;
    }
  }

  isWebhookConfigured(): boolean {
    return !!this.webhookToken;
  }
}
