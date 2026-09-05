import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  AfterLoad,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

const decimalToNumber = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'short_description' })
  shortDescription: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ nullable: true })
  brand: string;

  @Column({ unique: true })
  sku: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalToNumber })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'original_price', transformer: decimalToNumber })
  originalPrice: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalToNumber })
  cost: number | null;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'jsonb', default: [], name: 'images' })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, string>;

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ default: false, name: 'is_on_sale' })
  isOnSale: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'discount_percentage', transformer: decimalToNumber })
  discountPercentage: number | null;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'sales_count' })
  salesCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Materialized as own, enumerable properties after each load so they are
  // included in JSON serialization (class getters are not).
  finalPrice!: number;
  isInStock!: boolean;

  @AfterLoad()
  computeDerived(): void {
    const price = Number(this.price);
    if (this.isOnSale && this.discountPercentage) {
      this.finalPrice = Math.round(price * (1 - Number(this.discountPercentage) / 100) * 100) / 100;
    } else {
      this.finalPrice = price;
    }
    this.isInStock = this.stock > 0;
  }
}
