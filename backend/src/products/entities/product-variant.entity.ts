import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

/**
 * A concrete, sellable variation of a product (e.g. "Negro" for the Color
 * option). It has its own stock and image gallery; price and discount always
 * come from the parent product.
 */
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /** Value shown to the customer, e.g. "Negro". */
  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  sku: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
