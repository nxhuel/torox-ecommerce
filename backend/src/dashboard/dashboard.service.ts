import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Product } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { FinanceMovement, MovementType } from '../finance/entities/finance-movement.entity';

const REVENUE_STATUSES = [
  OrderStatus.PAYMENT_APPROVED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(FinanceMovement) private readonly financeRepo: Repository<FinanceMovement>,
  ) {}

  async getMetrics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [orders, revenueOrders, monthOrders, payments, users, products, movements] =
      await Promise.all([
        this.orderRepo.find(),
        this.orderRepo.find({ where: REVENUE_STATUSES.map((s) => ({ status: s })) }),
        this.orderRepo.find({ where: [{ createdAt: MoreThan(monthStart) }] }),
        this.paymentRepo.find(),
        this.userRepo.find({ where: { role: UserRole.CUSTOMER } }),
        this.productRepo.find({ where: { isActive: true } }),
        this.financeRepo.find(),
      ]);

    const sum = (list: any[], key: string) =>
      list.reduce((acc, item) => acc + Number(item[key] || 0), 0);

    const totalSales = sum(revenueOrders, 'total');
    const monthSales = sum(
      monthOrders.filter((o) => REVENUE_STATUSES.includes(o.status)),
      'total',
    );

    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    ).length;

    const lowStockProducts = products
      .filter((p) => p.stock > 0 && p.stock <= 5)
      .sort((a, b) => a.stock - b.stock);

    const totalIncome = sum(
      movements.filter((m) => m.type === MovementType.INCOME),
      'amount',
    );
    const totalExpense = sum(
      movements.filter((m) => m.type === MovementType.EXPENSE),
      'amount',
    );

    return {
      totalSales,
      monthSales,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === OrderStatus.PENDING_PAYMENT).length,
      customersCount: users.length,
      productsCount: products.length,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      pendingPayments,
      avgTicket: revenueOrders.length ? totalSales / revenueOrders.length : 0,
      profit: totalIncome - totalExpense,
    };
  }

  async getSalesByMonth(months = 12) {
    const movements = await this.financeRepo.find();
    const now = new Date();
    const series: { month: string; label: string; sales: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const income = movements
        .filter(
          (m) =>
            m.type === MovementType.INCOME &&
            m.date.getFullYear() === date.getFullYear() &&
            m.date.getMonth() === date.getMonth(),
        )
        .reduce((acc, m) => acc + Number(m.amount), 0);
      series.push({
        month: key,
        label: date.toLocaleDateString('es-AR', { month: 'short' }),
        sales: income,
      });
    }
    return series;
  }

  async getOrdersByStatus() {
    const orders = await this.orderRepo.find();
    const counts: Record<string, number> = {};
    for (const status of Object.values(OrderStatus)) {
      counts[status] = 0;
    }
    for (const order of orders) {
      counts[order.status] = (counts[order.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  async getTopProducts(limit = 5) {
    const items = await this.itemRepo.find();
    const map = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();

    for (const item of items) {
      const current = map.get(item.productId) || {
        productId: item.productId,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += Number(item.subtotal);
      map.set(item.productId, current);
    }

    return [...map.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }
}