import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ShippingMethod {
  /** Entrega a domicilio. */
  HOME_DELIVERY = 'HOME_DELIVERY',
  /** El comprador retira el paquete en una sucursal del carrier. */
  BRANCH_PICKUP = 'BRANCH_PICKUP',
  /** El comprador retira el paquete en el local de TOROX (sin envío). */
  PICKUP = 'PICKUP',
}

/** Snapshot de la opción de Envia.com que eligió el comprador. */
export interface ShippingOptionSnapshot {
  id: string;
  carrier: string;
  carrierName: string;
  service: string;
  serviceDescription?: string;
  /** 0 = puerta a puerta, 1 = puerta a sucursal, 2 = sucursal a puerta, 3 = sucursal a sucursal. */
  dropOff: number;
  dropOffDescription?: string;
  deliveryMode: 'HOME' | 'BRANCH';
  pickupMode: 'DOOR' | 'BRANCH';
  cost: number;
  currency: string;
  deliveryEstimate?: string;
  deliveryDate?: string;
}

/** Sucursal elegida por el comprador (retiro en sucursal). */
export interface ShippingBranchSnapshot {
  branchCode: string;
  branchId?: string;
  carrier: string;
  carrierName?: string;
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
  distanceKm?: number;
  phone?: string;
  hours?: unknown;
}

/**
 * Origen congelado del pedido: la sucursal (o la dirección) desde la que sale
 * el paquete. Se guarda al confirmar la compra para que la etiqueta se genere
 * siempre desde el mismo lugar, aunque después el admin cambie el origen
 * configurado en el panel.
 */
export interface ShippingOriginSnapshot {
  /** Carrier (paquetería) al que pertenece este origen. */
  carrier: string;
  /** Sucursal de origen (si el paquete se deja en una sucursal de Envia). */
  branchCode: string | null;
  reference?: string | null;
  address: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    branchCode?: string;
  };
}

export interface ShippingAddress {
  province: string;
  city: string;
  postalCode: string;
  address: string;
  number: string;
  apartment?: string;
  references?: string;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'order_number' })
  orderNumber: string;

  @Column({ nullable: true, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_email' })
  customerEmail: string;

  @Column({ nullable: true, name: 'customer_phone' })
  customerPhone: string;

  @Column({ type: 'jsonb', name: 'shipping_address' })
  shippingAddress: ShippingAddress;

  @Column({ type: 'enum', enum: ShippingMethod, default: ShippingMethod.HOME_DELIVERY, name: 'shipping_method' })
  shippingMethod: ShippingMethod;

  /** Opción de Envia.com elegida por el comprador (carrier, servicio y precio real). */
  @Column({ type: 'jsonb', nullable: true, name: 'shipping_option' })
  shippingOption: ShippingOptionSnapshot | null;

  /** Sucursal de retiro elegida por el comprador (si aplica). */
  @Column({ type: 'jsonb', nullable: true, name: 'shipping_branch' })
  shippingBranch: ShippingBranchSnapshot | null;

  /** Origen congelado del envío (sucursal o dirección desde donde sale el paquete). */
  @Column({ type: 'jsonb', nullable: true, name: 'shipping_origin' })
  shippingOrigin: ShippingOriginSnapshot | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'shipping_cost' })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id' })
  productId: string;

  /** Variant chosen by the customer (null for products without variants). */
  @Column({ type: 'uuid', nullable: true, name: 'variant_id' })
  variantId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'variant_name' })
  variantName: string | null;

  @Column()
  name: string;

  @Column()
  sku: string;

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}