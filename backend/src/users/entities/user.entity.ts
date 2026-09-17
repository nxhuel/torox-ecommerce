import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  // --- Password reset code -------------------------------------------------
  // These are `select: false` so they never come back from a normal query and
  // leak through /auth/me or /users. UsersService.findResetCode() reads them
  // explicitly when the reset flow needs them.

  @Column({ nullable: true, name: 'reset_code_hash', select: false })
  @Exclude()
  resetCodeHash: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reset_code_expires_at', select: false })
  @Exclude()
  resetCodeExpiresAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'reset_code_attempts', select: false })
  @Exclude()
  resetCodeAttempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
