import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum ShipmentStatus {
  PREPARING = 'PREPARING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
}

export interface ShipmentEvent {
  status: ShipmentStatus;
  date: Date;
  description: string;
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'order_id' })
  orderId: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ unique: true, name: 'tracking_number' })
  trackingNumber: string;

  @Column({ default: 'Envia.com' })
  carrier: string;

  /** ID interno del envío en Envia.com (shipmentId). Se usa para sincronizar el estado. */
  @Column({ nullable: true, name: 'envia_id' })
  enviaId: string;

  /** URL del PDF de la etiqueta devuelta por Envia al generar el envío. */
  @Column({ nullable: true, name: 'label_url' })
  labelUrl: string;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PREPARING })
  status: ShipmentStatus;

  @Column({ name: 'estimated_delivery' })
  estimatedDelivery: Date;

  @Column({ type: 'jsonb', default: [], name: 'events' })
  events: ShipmentEvent[];

  @Column({ nullable: true, name: 'shipped_at' })
  shippedAt: Date;

  @Column({ nullable: true, name: 'delivered_at' })
  deliveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}