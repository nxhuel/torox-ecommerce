import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { Cart } from '../cart/entities/cart.entity';
import { FinanceMovement } from '../finance/entities/finance-movement.entity';

/** Email en minúscula y sin espacios, para comparar y guardar siempre igual. */
export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Los emails se guardan siempre en minúscula y sin espacios: así
    // "Juan@Gmail.com" y "juan@gmail.com" son la misma cuenta.
    const email = normalizeEmail(dto.email);
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, email, password: hash });
    return this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ where: { role: UserRole.CUSTOMER } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * Busca sin distinguir mayúsculas. Hace falta para las cuentas viejas que se
   * registraron con mayúsculas (antes no se normalizaba el email).
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    return this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(TRIM(user.email)) = :email', { email: normalized })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if ((dto as { email?: string }).email) {
      (dto as { email?: string }).email = normalizeEmail((dto as { email?: string }).email);
    }
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);

    await this.userRepo.manager.transaction(async (manager) => {
      const orders = await manager.find(Order, {
        where: { userId: user.id },
        select: { id: true },
      });
      const orderIds = orders.map((order) => order.id);

      if (orderIds.length) {
        // Payments and shipments reference the order without ON DELETE, so they
        // have to go first. order_items cascades with its order.
        await manager.delete(Payment, { orderId: In(orderIds) });
        await manager.delete(Shipment, { orderId: In(orderIds) });
        await manager.delete(FinanceMovement, { referenceId: In(orderIds) });
        await manager.delete(Order, { id: In(orderIds) });
      }

      // carts.user_id also blocks the delete; cart_items cascades with the cart.
      // favorites and notifications already cascade on user delete.
      await manager.delete(Cart, { userId: user.id });
      await manager.delete(User, { id: user.id });
    });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  /** Stores a fresh password reset code, invalidating any previous one. */
  async setResetCode(userId: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.userRepo.update(userId, {
      resetCodeHash: codeHash,
      resetCodeExpiresAt: expiresAt,
      resetCodeAttempts: 0,
    });
  }

  /**
   * Reads the reset-code fields, which are excluded from normal selects so they
   * never leak through /auth/me or /users.
   */
  async findResetCode(userId: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect(['user.resetCodeHash', 'user.resetCodeExpiresAt', 'user.resetCodeAttempts'])
      .where('user.id = :userId', { userId })
      .getOne();
  }

  /** Counts a wrong code so brute-force attempts can be capped. */
  async countFailedResetAttempt(userId: string): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'resetCodeAttempts', 1);
  }

  /** Removes the reset code once it is used, expired or abused. */
  async clearResetCode(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      resetCodeHash: null,
      resetCodeExpiresAt: null,
      resetCodeAttempts: 0,
    });
  }

  async getCustomerStats(userId: string) {
    return { userId };
  }
}
