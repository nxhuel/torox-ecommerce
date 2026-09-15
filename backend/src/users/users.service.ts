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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password: hash });
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

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
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

  async getCustomerStats(userId: string) {
    return { userId };
  }
}
