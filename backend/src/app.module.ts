import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PromotionsModule } from './promotions/promotions.module';
import { FinanceModule } from './finance/finance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SeedModule } from './database/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'torox_user'),
        password: config.get('DATABASE_PASSWORD', 'torox_pass_2024'),
        database: config.get('DATABASE_NAME', 'torox_db'),
        autoLoadEntities: true,
        synchronize: true, // Only for dev/demo
        logging: config.get('NODE_ENV') === 'development',
        // Render Postgres requires TLS; enable when DATABASE_SSL=true
        ...(config.get('DATABASE_SSL') === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    FavoritesModule,
    OrdersModule,
    PaymentsModule,
    ShipmentsModule,
    NotificationsModule,
    PromotionsModule,
    FinanceModule,
    DashboardModule,
    SeedModule,
  ],
})
export class AppModule {}
