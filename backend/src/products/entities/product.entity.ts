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
import { SpecGroup } from '../product-specs.types';

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

  /** List price (the price shown crossed out on the storefront when a discount applies). */
  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalToNumber })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalToNumber })
  cost: number | null;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'jsonb', default: [], name: 'images' })
  images: string[];

  @Column({ type: 'jsonb', nullable: true })
  specifications: Record<string, string>;

  /** Short bullet points shown as "Lo que tenés que saber de este producto". */
  @Column({ type: 'jsonb', default: [] })
  highlights: string[];

  /** Grouped specification tables shown as "Características del producto". */
  @Column({ type: 'jsonb', default: [] })
  specGroups: SpecGroup[];

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ default: false, name: 'is_on_sale' })
  isOnSale: boolean;

  // Scale 6 so exact discounts can be entered (e.g. 21.951220% -> a round final price).
  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true, name: 'discount_percentage', transformer: decimalToNumber })
  discountPercentage: number | null;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'sales_count' })
  salesCount: number;

  // ─── Campos de logística para cotización con Envia.com ───────────────────
  /** Peso real del producto en kilogramos (usado para cotizar el envío). */
  @Column({ type: 'decimal', precision: 8, scale: 3, default: 0.5, name: 'weight_kg', transformer: decimalToNumber })
  weightKg: number;

  /** Ancho del embalaje en centímetros. */
  @Column({ type: 'decimal', precision: 7, scale: 2, default: 15, name: 'width_cm', transformer: decimalToNumber })
  widthCm: number;

  /** Alto del embalaje en centímetros. */
  @Column({ type: 'decimal', precision: 7, scale: 2, default: 10, name: 'height_cm', transformer: decimalToNumber })
  heightCm: number;

  /** Largo del embalaje en centímetros. */
  @Column({ type: 'decimal', precision: 7, scale: 2, default: 15, name: 'length_cm', transformer: decimalToNumber })
  lengthCm: number;

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
    const discount = Number(this.discountPercentage);
    // `price` is the list price; the storefront shows it crossed out and
    // `finalPrice` as the price to pay whenever a discount is applied.
    if (this.isOnSale && discount > 0 && discount < 100) {
      this.finalPrice = Math.round(price * (1 - discount / 100) * 100) / 100;
    } else {
      this.finalPrice = price;
    }
    this.isInStock = this.stock > 0;
  }
}
