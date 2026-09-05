import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.service.findAll();
  }

  @Get('order/:orderId')
  @Roles('ADMIN')
  findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }
}