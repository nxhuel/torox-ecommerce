import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { FinanceMovement } from '../finance/entities/finance-movement.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Order, OrderItem, Payment, Product, User, FinanceMovement]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}