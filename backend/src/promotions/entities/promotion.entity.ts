import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
  AfterInsert,
  AfterUpdate,
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

  /**
   * Computed status exposed in the API response. It has to be a real own
   * property (not a getter): the global ClassSerializerInterceptor uses
   * class-transformer, which drops prototype getters, so the admin UI received
   * `undefined` and always rendered "Inactiva".
   */
  isCurrentlyActive: boolean;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  computeIsCurrentlyActive(): void {
    const now = Date.now();
    const start = new Date(this.startDate).getTime();
    const end = new Date(this.endDate).getTime();
    this.isCurrentlyActive = Boolean(this.isActive) && start <= now && now <= end;
  }
}