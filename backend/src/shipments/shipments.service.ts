import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import {
  SHIPMENT_PROVIDER,
  ShipmentProvider,
} from './providers/shipment-provider.interface';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly repo: Repository<Shipment>,
    @Inject(SHIPMENT_PROVIDER)
    private readonly provider: ShipmentProvider,
  ) {}

  async createForOrder(order: Order): Promise<Shipment> {
    const existing = await this.repo.findOne({ where: { orderId: order.id } });
    if (existing) return existing;

    const address = order.shippingAddress;
    const result = await this.provider.createShipment({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      address: `${address.address} ${address.number}, ${address.city}, ${address.province}`,
    });

    const shipment = this.repo.create({
      orderId: order.id,
      trackingNumber: result.trackingNumber,
      status: result.status,
      estimatedDelivery: result.estimatedDelivery,
      events: result.events,
    });

    return this.repo.save(shipment);
  }

  async advance(id: string): Promise<Shipment> {
    const shipment = await this.findOne(id);
    const next = this.provider.getNextStatus(shipment.status);
    if (!next) throw new BadRequestException('El envío ya fue entregado');

    shipment.status = next;
    shipment.events = [
      ...(shipment.events || []),
      {
        status: next,
        date: new Date(),
        description: this.getDescription(next),
      },
    ];

    if (next === ShipmentStatus.PICKED_UP) shipment.shippedAt = new Date();
    if (next === ShipmentStatus.DELIVERED) shipment.deliveredAt = new Date();

    return this.repo.save(shipment);
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.repo.findOne({ where: { id }, relations: { order: true } });
    if (!shipment) throw new NotFoundException('Envío no encontrado');
    return shipment;
  }

  async findByOrder(orderId: string): Promise<Shipment | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  async findByTracking(trackingNumber: string): Promise<Shipment> {
    const shipment = await this.repo.findOne({
      where: { trackingNumber },
      relations: { order: true },
    });
    if (!shipment) throw new NotFoundException('Envío no encontrado');
    return shipment;
  }

  async findAll(): Promise<Shipment[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: { order: true } });
  }

  private getDescription(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.PREPARING:
        return 'El paquete se está preparando en el depósito.';
      case ShipmentStatus.PICKED_UP:
        return 'El paquete fue retirado por Andreani.';
      case ShipmentStatus.IN_TRANSIT:
        return 'El paquete está viajando hacia su destino.';
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 'El paquete está en el reparto, cerca tuyo.';
      case ShipmentStatus.DELIVERED:
        return 'El paquete fue entregado correctamente.';
    }
  }
}