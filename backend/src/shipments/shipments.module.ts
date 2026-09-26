import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { EnviaWebhookController } from './envia-webhook.controller';
import { WebhookIdempotencyService } from './webhook-idempotency.service';
import { Shipment } from './entities/shipment.entity';
import { EnviaProvider } from './providers/envia.provider';
import { SHIPMENT_PROVIDER } from './providers/shipment-provider.interface';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    HttpModule,
    ConfigModule,
    ProductsModule,
  ],
  controllers: [ShipmentsController, EnviaWebhookController],
  providers: [
    ShipmentsService,
    WebhookIdempotencyService,
    EnviaProvider,
    {
      provide: SHIPMENT_PROVIDER,
      useClass: EnviaProvider,
    },
  ],
  exports: [ShipmentsService, EnviaProvider],
})
export class ShipmentsModule {}
