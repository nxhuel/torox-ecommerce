import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.service.createFromCart(dto, user?.id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentUser() user: User) {
    return this.service.getCustomerOrders(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      search,
      userId,
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOneForUser(id, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Post(':id/approve-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  approvePayment(@Param('id') id: string) {
    return this.service.approvePayment(id);
  }

  @Post(':id/reject-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  rejectPayment(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.rejectPayment(id, body?.reason);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.updateStatus(id, {
      status: 'CANCELLED' as any,
      notes: body?.reason,
    });
  }

  @Post(':id/start-mercado-pago')
  @UseGuards(OptionalJwtAuthGuard)
  startMercadoPago(@Param('id') id: string, @Body() body: { customerEmail: string; customerName?: string; customerPhone?: string }) {
    return this.service.startMercadoPagoPayment(id, body);
  }

  @Get(':id/mercado-pago-url')
  @UseGuards(OptionalJwtAuthGuard)
  getMercadoPagoUrl(@Param('id') id: string) {
    return this.service.getMercadoPagoRedirectUrl(id);
  }
}