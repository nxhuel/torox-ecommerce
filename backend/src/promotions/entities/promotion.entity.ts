import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromotionType {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
  SPECIAL_OFFER = 'SPECIAL_OFFER',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ type: 'jsonb', default: [], name: 'product_ids' })
  productIds: string[];

  @Column({ type: 'jsonb', default: [], name: 'category_ids' })
  categoryIds: string[];

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get isCurrentlyActive(): boolean {
    const now = new Date();
    return (
      this.isActive &&
      new Date(this.startDate) <= now &&
      new Date(this.endDate) >= now
    );
  }
}