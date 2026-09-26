import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ShipmentProvider,
  CreateShipmentInput,
  ShipmentCreationResult,
  ShipmentQuoteResult,
} from './shipment-provider.interface';
import { ShipmentStatus } from '../entities/shipment.entity';

// ─── Mapeo nombre de provincia → código de estado de Envia ──────────────────
// Envia usa el campo `code_2_digits` que devuelve
// GET https://queries.envia.com/state?country_code=AR
// Ej.: Buenos Aires = "BA", CABA = "DF", Córdoba = "CB".
export const PROVINCE_MAP: Record<string, string> = {
  'Buenos Aires': 'BA',
  'CABA': 'DF',
  'Ciudad Autónoma de Buenos Aires': 'DF',
  'Catamarca': 'CT',
  'Chaco': 'CC',
  'Chubut': 'CH',
  'Córdoba': 'CB',
  'Corrientes': 'CN',
  'Entre Ríos': 'ER',
  'Formosa': 'FM',
  'Jujuy': 'JY',
  'La Pampa': 'LP',
  'La Rioja': 'LR',
  'Mendoza': 'MZ',
  'Misiones': 'MN',
  'Neuquén': 'NQ',
  'Río Negro': 'RN',
  'Salta': 'SA',
  'San Juan': 'SJ',
  'San Luis': 'SL',
  'Santa Cruz': 'SC',
  'Santa Fe': 'SF',
  'Santiago del Estero': 'SE',
  'Tierra del Fuego': 'TF',
  'Tucumán': 'TM',
};

// Carriers que se cotizan por defecto en Argentina (se puede override con ENVIA_CARRIERS).
const DEFAULT_CARRIERS = ['correoArgentino', 'andreani', 'oca'];

// ─── Mapeo estado Envia → ShipmentStatus ────────────────────────────────────
const ENVIA_STATUS_MAP: Record<string, ShipmentStatus> = {
  created: ShipmentStatus.PREPARING,
  'label created': ShipmentStatus.PREPARING,
  ready: ShipmentStatus.PREPARING,
  'ready for pickup': ShipmentStatus.PREPARING,
  'picked up': ShipmentStatus.PICKED_UP,
  collected: ShipmentStatus.PICKED_UP,
  'in pickup': ShipmentStatus.PICKED_UP,
  'at origin': ShipmentStatus.IN_TRANSIT,
  received: ShipmentStatus.IN_TRANSIT,
  'in transit': ShipmentStatus.IN_TRANSIT,
  transit: ShipmentStatus.IN_TRANSIT,
  'out for delivery': ShipmentStatus.OUT_FOR_DELIVERY,
  'in delivery': ShipmentStatus.OUT_FOR_DELIVERY,
  'on the way': ShipmentStatus.OUT_FOR_DELIVERY,
  delivered: ShipmentStatus.DELIVERED,
};

const STATUS_FLOW: ShipmentStatus[] = [
  ShipmentStatus.PREPARING,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
];

/** Item que devuelve POST /ship/rate/ (solo los campos que usamos). */
interface EnviaRateItem {
  carrier: string;
  carrierDescription?: string;
  carrierId: number | string;
  serviceId?: number | string;
  service: string;
  serviceDescription?: string;
  /** 0 = puerta a puerta (a domicilio), 2 = sucursal a puerta. */
  dropOff?: number;
  deliveryEstimate?: string;
  deliveryDate?: { date?: string; dateDifference?: number; timeUnit?: string };
  totalPrice: number | string;
  currency?: string;
}

export interface EnviaQuoteParams {
  /** Código de estado Envia para el destino (code_2_digits, ej. "DF"). */
  provinceCode: string;
  postalCode: string;
  city?: string;
  weightKg: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  /** Valor declarado del paquete (seguro). */
  declaredValue?: number;
  content?: string;
}

@Injectable()
export class EnviaProvider implements ShipmentProvider {
  private readonly logger = new Logger(EnviaProvider.name);
  private readonly apiBase = process.env.ENVIA_API_BASE || 'https://api.envia.com';

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  // ─── Auth ────────────────────────────────────────────────────────────────────
  /**
   * Envia usa un único Bearer token (la API key del dashboard), sin endpoint de login.
   * Si no está configurado, se trabaja en modo demo para no romper el checkout.
   */
  private getToken(): string {
    const token = this.config.get<string>('ENVIA_API_KEY');
    if (!token) {
      this.logger.warn('ENVIA_API_KEY no configurada. Usando modo demo.');
      return 'DEMO_MODE';
    }
    return token;
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private get carriers(): string[] {
    const configured = this.config.get<string>('ENVIA_CARRIERS');
    if (!configured) return DEFAULT_CARRIERS;
    const list = configured
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return list.length ? list : DEFAULT_CARRIERS;
  }

  // ─── Direcciones ─────────────────────────────────────────────────────────────
  private get origin() {
    return {
      name: this.config.get<string>('ENVIA_ORIGIN_NAME', 'TOROX'),
      company: this.config.get<string>('ENVIA_ORIGIN_COMPANY', 'TOROX'),
      phone: this.config.get<string>('ENVIA_ORIGIN_PHONE', ''),
      email: this.config.get<string>('ENVIA_ORIGIN_EMAIL', ''),
      street: this.config.get<string>('ENVIA_ORIGIN_STREET', ''),
      city: this.config.get<string>('ENVIA_ORIGIN_CITY', ''),
      state: this.config.get<string>('ENVIA_ORIGIN_STATE', 'DF'),
      country: 'AR',
      postalCode: this.config.get<string>('ENVIA_ORIGIN_POSTAL_CODE', ''),
    };
  }

  private buildPackage(params: {
    weightKg: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
    declaredValue?: number;
    content?: string;
  }) {
    return {
      type: 'box',
      content: params.content || 'Producto',
      amount: 1,
      declaredValue: params.declaredValue ?? 0,
      weight: params.weightKg,
      weightUnit: 'KG',
      lengthUnit: 'CM',
      dimensions: {
        length: params.lengthCm,
        width: params.widthCm,
        height: params.heightCm,
      },
    };
  }

  // ─── Cotización ──────────────────────────────────────────────────────────────
  /**
   * Envia cotiza un carrier por request, así que consultamos ENVIA_CARRIERS
   * y devolvemos la opción a domicilio (puerta a puerta) más barata.
   */
  async quote(params: EnviaQuoteParams): Promise<ShipmentQuoteResult> {
    const token = this.getToken();
    if (token === 'DEMO_MODE') {
      return { cost: 12000, carrierName: 'Envia (demo)', currency: 'ARS' };
    }

    const destination = {
      name: 'Cliente',
      phone: '',
      street: '',
      city: params.city || '',
      state: params.provinceCode,
      country: 'AR',
      postalCode: params.postalCode,
    };
    const packages = [
      this.buildPackage({
        weightKg: params.weightKg,
        widthCm: params.widthCm,
        heightCm: params.heightCm,
        lengthCm: params.lengthCm,
        declaredValue: params.declaredValue,
        content: params.content,
      }),
    ];

    const all: EnviaRateItem[] = [];
    for (const carrier of this.carriers) {
      try {
        const response = await firstValueFrom(
          this.http.post<{ meta: string; data: EnviaRateItem[]; error?: unknown }>(
            `${this.apiBase}/ship/rate/`,
            {
              origin: this.origin,
              destination,
              packages,
              shipment: { type: 1, carrier },
            },
            { headers: this.headers(token) },
          ),
        );
        all.push(...(response.data?.data ?? []));
      } catch (error: any) {
        // Un carrier caído no debe romper la cotización completa.
        this.logger.warn(
          `No se pudo cotizar con ${carrier}: ${error?.response?.data ? JSON.stringify(error.response.data) : error?.message}`,
        );
      }
    }

    const home = all.filter((item) => item.dropOff === 0);
    const pool = home.length ? home : all;
    if (!pool.length) {
      throw new Error('Envia no devolvió cotizaciones para la dirección indicada');
    }

    const best = pool.reduce((a, b) =>
      Number(b.totalPrice) < Number(a.totalPrice) ? b : a,
    );

    return {
      cost: Number(best.totalPrice),
      currency: best.currency,
      carrier: best.carrier,
      carrierId: String(best.carrierId),
      carrierName: best.carrierDescription ?? best.carrier,
      service: best.service,
      serviceDescription: best.serviceDescription,
      deliveryEstimate: best.deliveryEstimate,
      deliveryDate: best.deliveryDate?.date,
    };
  }

  // ─── Crear envío (generar etiqueta) ─────────────────────────────────────────
  async createShipment(input: CreateShipmentInput): Promise<ShipmentCreationResult> {
    const token = this.getToken();

    const weightKg = input.weightKg ?? 0.5;
    const widthCm = input.widthCm ?? 15;
    const heightCm = input.heightCm ?? 10;
    const lengthCm = input.lengthCm ?? 15;

    if (token === 'DEMO_MODE') {
      const quote: ShipmentQuoteResult = {
        cost: 12000,
        carrier: 'demo',
        carrierName: 'Envia (demo)',
        service: 'demo',
      };
      return this.buildDemoResult(input.orderNumber, quote);
    }

    // Elegimos la opción a domicilio más barata para generar la etiqueta.
    const quote = await this.quote({
      provinceCode: input.provinceCode || 'DF',
      postalCode: input.postalCode || '',
      city: input.city,
      weightKg,
      widthCm,
      heightCm,
      lengthCm,
      declaredValue: input.declaredValue,
    });

    const destination = {
      name: input.customerName,
      phone: input.customerPhone || '',
      email: input.customerEmail || '',
      street: input.address,
      city: input.city || '',
      state: input.provinceCode || 'DF',
      country: 'AR',
      postalCode: input.postalCode || '',
    };

    const response = await firstValueFrom(
      this.http.post<{
        meta: string;
        data: {
          carrier: string;
          service: string;
          shipmentId: number | string;
          trackingNumber: string;
          trackUrl?: string;
          label?: string;
          totalPrice?: number | string;
          currency?: string;
        }[];
      }>(
        `${this.apiBase}/ship/generate/`,
        {
          origin: this.origin,
          destination,
          packages: [
            this.buildPackage({
              weightKg,
              widthCm,
              heightCm,
              lengthCm,
              declaredValue: input.declaredValue,
            }),
          ],
          shipment: {
            type: 1,
            carrier: quote.carrier,
            service: quote.service,
          },
        },
        { headers: this.headers(token) },
      ),
    );

    const data = response.data?.data?.[0];
    if (!data?.trackingNumber) {
      throw new Error(`Envia no devolvió tracking: ${JSON.stringify(response.data)}`);
    }

    const estimatedDelivery = quote.deliveryDate
      ? new Date(quote.deliveryDate)
      : this.daysFromNow(5);

    return {
      trackingNumber: data.trackingNumber,
      status: ShipmentStatus.PREPARING,
      estimatedDelivery,
      carrierName: quote.carrierName,
      enviaId: String(data.shipmentId),
      labelUrl: data.label,
      events: [
        {
          status: ShipmentStatus.PREPARING,
          date: new Date(),
          description: 'Envío generado en Envia.com.',
        },
      ],
    };
  }

  // ─── Estado del envío ────────────────────────────────────────────────────────
  async getShipmentStatus(
    trackingNumber: string,
  ): Promise<{ status: ShipmentStatus; description?: string } | null> {
    try {
      const token = this.getToken();
      if (token === 'DEMO_MODE') return null;

      const response = await firstValueFrom(
        this.http.post<{
          data: {
            trackingNumber: string;
            status: string;
            carrier?: string;
            events?: { timestamp?: string; description?: string; location?: string }[];
          }[];
        }>(
          `${this.apiBase}/ship/generaltrack/`,
          { trackingNumbers: [trackingNumber] },
          { headers: this.headers(token) },
        ),
      );

      const data = response.data?.data?.[0];
      if (!data) return null;

      const lastEvent = data.events?.[data.events.length - 1];
      return {
        status: this.mapStatus(data.status),
        description: lastEvent?.description,
      };
    } catch (error: any) {
      this.logger.error(`No se pudo obtener el estado de ${trackingNumber}: ${error?.message}`);
      return null;
    }
  }

  // ─── ShipmentProvider interface ──────────────────────────────────────────────
  getNextStatus(current: ShipmentStatus): ShipmentStatus | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  mapStatus(enviaStatus?: string): ShipmentStatus {
    if (!enviaStatus) return ShipmentStatus.PREPARING;
    const normalized = enviaStatus.toLowerCase().trim();
    if (ENVIA_STATUS_MAP[normalized]) return ENVIA_STATUS_MAP[normalized];
    // Envia a veces manda estados compuestos: los resolvemos por substring.
    if (normalized.includes('deliver')) return ShipmentStatus.DELIVERED;
    if (normalized.includes('out for')) return ShipmentStatus.OUT_FOR_DELIVERY;
    if (normalized.includes('pick')) return ShipmentStatus.PICKED_UP;
    if (normalized.includes('transit') || normalized.includes('origin'))
      return ShipmentStatus.IN_TRANSIT;
    return ShipmentStatus.PREPARING;
  }

  private daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private buildDemoResult(
    orderNumber: string,
    quote: ShipmentQuoteResult,
  ): ShipmentCreationResult {
    return {
      trackingNumber: `ENVIA-DEMO-${orderNumber}`,
      status: ShipmentStatus.PREPARING,
      estimatedDelivery: this.daysFromNow(5),
      carrierName: quote.carrierName || 'Envia (demo)',
      enviaId: `demo-${Date.now()}`,
      events: [
        {
          status: ShipmentStatus.PREPARING,
          date: new Date(),
          description: 'Envío registrado en Envia.com (modo demo).',
        },
      ],
    };
  }
}
