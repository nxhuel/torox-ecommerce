import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MockPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useClass: MockPaymentProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}