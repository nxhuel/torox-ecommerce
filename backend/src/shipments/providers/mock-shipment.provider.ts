import { Injectable } from '@nestjs/common';
import {
  ShipmentProvider,
  CreateShipmentInput,
  ShipmentCreationResult,
} from './shipment-provider.interface';
import { ShipmentStatus } from '../entities/shipment.entity';

const STATUS_FLOW: ShipmentStatus[] = [
  ShipmentStatus.PREPARING,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
];

const STATUS_DESCRIPTIONS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PREPARING]: 'El paquete se está preparando en el depósito.',
  [ShipmentStatus.PICKED_UP]: 'El paquete fue retirado por Andreani.',
  [ShipmentStatus.IN_TRANSIT]: 'El paquete está viajando hacia su destino.',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'El paquete está en el reparto, cerca tuyo.',
  [ShipmentStatus.DELIVERED]: 'El paquete fue entregado correctamente.',
};

/**
 * Simulated shipment provider (stands in for Andreani).
 *
 * Replace this provider by an AndreaniProvider implementing the same
 * ShipmentProvider interface when real integrations are added.
 */
@Injectable()
export class MockShipmentProvider implements ShipmentProvider {
  async createShipment(_input: CreateShipmentInput): Promise<ShipmentCreationResult> {
    // Simulate provider latency.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const trackingNumber = `TORX-AND-${this.generateTrackingNumber()}`;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    return {
      trackingNumber,
      status: ShipmentStatus.PREPARING,
      estimatedDelivery,
      events: [
        {
          status: ShipmentStatus.PREPARING,
          date: new Date(),
          description: 'Envío generado correctamente en el sistema de Andreani.',
        },
      ],
    };
  }

  getNextStatus(current: ShipmentStatus): ShipmentStatus | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  getStatusDescription(status: ShipmentStatus): string {
    return STATUS_DESCRIPTIONS[status];
  }

  private generateTrackingNumber(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}