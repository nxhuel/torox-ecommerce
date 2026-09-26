import { ShipmentStatus } from '../entities/shipment.entity';

export interface CreateShipmentInput {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  address: string;
  city?: string;
  postalCode?: string;
  /** Código de estado de Envia para AR (code_2_digits, ej. "DF" = CABA). */
  provinceCode?: string;
  /** Peso total del paquete en kg */
  weightKg?: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
  /** Valor declarado del paquete (seguro). */
  declaredValue?: number;
}

export interface ShipmentCreationResult {
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery: Date;
  /** ID interno del envío en Envia (shipmentId). */
  enviaId?: string;
  /** URL del PDF de la etiqueta devuelta por Envia al generarla. */
  labelUrl?: string;
  /** URL de rastreo de Envia.com para el cliente. */
  trackingUrl?: string;
  carrierName?: string;
  events: { status: ShipmentStatus; date: Date; description: string }[];
}

export interface ShipmentQuoteResult {
  cost: number;
  currency?: string;
  /** Slug del carrier en Envia (ej. "correoArgentino"). */
  carrier?: string;
  carrierId?: string;
  carrierName?: string;
  service?: string;
  serviceDescription?: string;
  deliveryEstimate?: string;
  /** Fecha estimada de entrega (ISO) según Envia. */
  deliveryDate?: string;
}

export interface ShipmentProvider {
  createShipment(input: CreateShipmentInput): Promise<ShipmentCreationResult>;
  getNextStatus(current: ShipmentStatus): ShipmentStatus | null;
}

export const SHIPMENT_PROVIDER = 'SHIPMENT_PROVIDER';
