import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { MercadoPagoController } from './mercado-pago.controller';
import { Payment } from './entities/payment.entity';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    HttpModule,
  ],
  controllers: [PaymentsController, MercadoPagoController, MercadoPagoWebhookController],
  providers: [
    PaymentsService,
    MercadoPagoService,
    // For now, use MockPaymentProvider since Checkout Pro redirects
    // In production, you can switch to MercadoPagoService for the processPayment method
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentProvider,
    },
  ],
  exports: [PaymentsService, MercadoPagoService],
})
export class PaymentsModule {}