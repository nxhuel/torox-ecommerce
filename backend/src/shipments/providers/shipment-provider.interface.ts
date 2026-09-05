import { ShipmentStatus } from '../entities/shipment.entity';

export interface CreateShipmentInput {
  orderNumber: string;
  customerName: string;
  address: string;
}

export interface ShipmentCreationResult {
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery: Date;
  events: { status: ShipmentStatus; date: Date; description: string }[];
}

export interface ShipmentProvider {
  createShipment(input: CreateShipmentInput): Promise<ShipmentCreationResult>;
  getNextStatus(current: ShipmentStatus): ShipmentStatus | null;
}

export const SHIPMENT_PROVIDER = 'SHIPMENT_PROVIDER';