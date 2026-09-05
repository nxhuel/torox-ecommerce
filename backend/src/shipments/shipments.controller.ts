import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly service: ShipmentsService) {}

  @Get('tracking/:trackingNumber')
  getByTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.service.findByTracking(trackingNumber);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Post(':id/advance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  advance(@Param('id') id: string) {
    return this.service.advance(id);
  }
}