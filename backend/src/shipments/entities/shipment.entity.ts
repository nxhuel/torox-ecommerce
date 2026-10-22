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

  /** Nombre del servicio de Envia contratado (ej. "express", "standard"). */
  @Column({ type: 'varchar', nullable: true })
  service: string | null;

  /**
   * Modalidad del envío: 0 = puerta a puerta, 1 = puerta a sucursal,
   * 2 = sucursal a puerta, 3 = sucursal a sucursal.
   */
  @Column({ type: 'int', nullable: true, name: 'drop_off' })
  dropOff: number | null;

  /** Código de sucursal (branch_code) donde se entrega o se entrega el paquete. */
  @Column({ type: 'varchar', nullable: true, name: 'branch_code' })
  branchCode: string | null;

  /** Dirección legible de la sucursal involucrada. */
  @Column({ type: 'varchar', nullable: true, name: 'branch_address' })
  branchAddress: string | null;

  /** Dirección desde la que salió el paquete (la sucursal de origen configurada). */
  @Column({ type: 'varchar', nullable: true, name: 'origin_address' })
  originAddress: string | null;

  /** Sucursal de origen (la donde el admin deja el paquete). */
  @Column({ type: 'varchar', nullable: true, name: 'origin_branch_code' })
  originBranchCode: string | null;

  /** Valor declarado del paquete (seguro). */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'declared_value',
  })
  declaredValue: number | null;

  /** Datos del paquete enviado (peso y medidas). */
  @Column({ type: 'jsonb', nullable: true, name: 'package_info' })
  packageInfo: Record<string, number> | null;

  /** ID interno del envío en Envia.com (shipmentId). Se usa para sincronizar el estado. */
  @Column({ nullable: true, name: 'envia_id' })
  enviaId: string;

  /** URL del PDF de la etiqueta devuelta por Envia al generar el envío. */
  @Column({ nullable: true, name: 'label_url' })
  labelUrl: string;

  /** URL de rastreo en Envia.com para el cliente. */
  @Column({ nullable: true, name: 'track_url' })
  trackUrl: string;

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