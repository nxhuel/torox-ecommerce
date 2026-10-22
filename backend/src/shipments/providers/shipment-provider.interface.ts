import { ShipmentStatus } from '../entities/shipment.entity';

/**
 * Cómo llega el paquete al comprador.
 * - HOME:   entrega a domicilio (dropOff 0 o 2).
 * - BRANCH: el comprador retira en una sucursal (dropOff 1 o 3).
 */
export type DeliveryMode = 'HOME' | 'BRANCH';

/**
 * Cómo el remitente entrega el paquete al transportista.
 * - DOOR:   el transportista pasa a retirar en la dirección de origen (dropOff 0 o 1).
 * - BRANCH: el remitente deja el paquete en una sucursal (dropOff 2 o 3).
 */
export type PickupMode = 'DOOR' | 'BRANCH';

/** Dirección con el formato que espera la API de Envia. */
export interface EnviaAddress {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  phoneCode?: string;
  street: string;
  number?: string;
  city: string;
  /** Código de estado/provincia de Envia (2 letras, ej. "DF", "BA", "TF"). */
  state: string;
  country: string;
  postalCode: string;
  /**
   * Código de sucursal (`branch_code`). Necesario cuando la dirección es una
   * sucursal de Envia: sin él la etiqueta no se puede generar.
   */
  branchCode?: string;
  reference?: string;
}

/** Paquete a enviar (medidas en cm, peso en kg). */
export interface PackageSpec {
  content?: string;
  amount?: number;
  type?: 'envelope' | 'box' | 'pallet' | 'full_truck_load';
  weightKg: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  declaredValue?: number;
}

/** Sucursal (centro de admisión / punto de retiro) de un carrier. */
export interface BranchInfo {
  branchCode: string;
  branchId?: string;
  carrier: string;
  carrierName?: string;
  /** Nombre de la sucursal tal como lo devuelve el carrier. */
  reference?: string;
  type: 'ORIGIN' | 'DESTINATION' | 'BOTH';
  address: {
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  /** Distancia en km desde el punto de consulta (la calcula Envia). */
  distanceKm?: number;
  phone?: string;
  hours?: unknown;
}

/**
 * Una opción de envío que puede elegir el comprador: un carrier + servicio +
 * modalidad de entrega, con su precio real y su tiempo estimado.
 */
export interface ShippingOption {
  /** Identificador estable `carrier|service|dropOff`. */
  id: string;
  carrier: string;
  carrierId?: string;
  carrierName: string;
  service: string;
  serviceDescription?: string;
  /** 0 = puerta a puerta, 1 = puerta a sucursal, 2 = sucursal a puerta, 3 = sucursal a sucursal. */
  dropOff: number;
  dropOffDescription?: string;
  deliveryMode: DeliveryMode;
  pickupMode: PickupMode;
  cost: number;
  currency: string;
  deliveryEstimate?: string;
  deliveryDate?: string;
  /** Sucursales donde el comprador puede retirar (solo si deliveryMode = BRANCH). */
  branches: BranchInfo[];
}

export interface CreateShipmentInput {
  orderNumber: string;
  origin: EnviaAddress;
  destination: EnviaAddress;
  package: PackageSpec;
  /** Carrier y servicio ya cotizados (los mismos que paga el comprador). */
  carrier?: string;
  service?: string;
  dropOff?: number;
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

export interface ShipmentProvider {
  createShipment(input: CreateShipmentInput): Promise<ShipmentCreationResult>;
  getNextStatus(current: ShipmentStatus): ShipmentStatus | null;
}

/** Token de inyección del proveedor de envíos (Envia.com). */
export const SHIPMENT_PROVIDER = 'SHIPMENT_PROVIDER';
