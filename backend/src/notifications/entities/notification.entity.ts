import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  PROMOTION = 'PROMOTION',
  OFFER = 'OFFER',
  ORDER_STATUS = 'ORDER_STATUS',
  SHIPMENT_STATUS = 'SHIPMENT_STATUS',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ nullable: true })
  link: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}