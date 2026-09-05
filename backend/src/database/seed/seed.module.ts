import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { Order, OrderItem } from '../../orders/entities/order.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { FinanceMovement } from '../../finance/entities/finance-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Product,
      Order,
      OrderItem,
      Payment,
      Shipment,
      Notification,
      Promotion,
      FinanceMovement,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}