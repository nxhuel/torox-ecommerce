import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MovementType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum MovementCategory {
  SALE = 'SALE',
  MERCHANDISE = 'MERCHANDISE',
  LOGISTICS = 'LOGISTICS',
  ADVERTISING = 'ADVERTISING',
  SALARY = 'SALARY',
  OTHER = 'OTHER',
}

@Entity('finance_movements')
export class FinanceMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'enum', enum: MovementCategory })
  category: MovementCategory;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column()
  date: Date;

  @Column({ nullable: true, name: 'reference_id' })
  referenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}