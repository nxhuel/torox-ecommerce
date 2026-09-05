import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('metrics')
  getMetrics() {
    return this.service.getMetrics();
  }

  @Get('sales-by-month')
  getSalesByMonth(@Query('months') months?: string) {
    return this.service.getSalesByMonth(months ? +months : 12);
  }

  @Get('orders-by-status')
  getOrdersByStatus() {
    return this.service.getOrdersByStatus();
  }

  @Get('top-products')
  getTopProducts(@Query('limit') limit?: string) {
    return this.service.getTopProducts(limit ? +limit : 5);
  }
}