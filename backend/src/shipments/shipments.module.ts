import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { Shipment } from './entities/shipment.entity';
import { MockShipmentProvider } from './providers/mock-shipment.provider';
import { SHIPMENT_PROVIDER } from './providers/shipment-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment]), PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [ShipmentsController],
  providers: [
    ShipmentsService,
    MockShipmentProvider,
    {
      provide: SHIPMENT_PROVIDER,
      useClass: MockShipmentProvider,
    },
  ],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}