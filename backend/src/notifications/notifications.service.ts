import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly usersService: UsersService,
  ) {}

  async createForUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<Notification> {
    const notification = this.repo.create({ userId, type, title, message, link });
    return this.repo.save(notification);
  }

  async createForOrderCustomer(
    order: { userId?: string; customerEmail: string },
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    if (order.userId) {
      await this.createForUser(order.userId, type, title, message, link);
      return;
    }
    // Guest orders: find a matching registered user by email, if any.
    const user = await this.usersService.findByEmail(order.customerEmail);
    if (user) {
      await this.createForUser(user.id, type, title, message, link);
    }
  }

  async broadcastToCustomers(
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<number> {
    const users = await this.usersService.findAll();
    const customers = users.filter((u) => u.role === UserRole.CUSTOMER);
    if (!customers.length) return 0;

    const notifications = customers.map((user) =>
      this.repo.create({ userId: user.id, type, title, message, link }),
    );
    await this.repo.save(notifications);
    return notifications.length;
  }

  async getForUser(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notificación no encontrada');
    notification.isRead = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}