import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoService } from './mercado-pago.service';
import { OrdersService } from '../orders/orders.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface CreatePreferenceDto {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: {
    province: string;
    city: string;
    postalCode: string;
    address: string;
    number?: string;
  };
}

@Controller('payments/mercadopago')
export class MercadoPagoController {
  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('create-preference')
  @UseGuards(OptionalJwtAuthGuard)
  async createPreference(@Body() dto: CreatePreferenceDto) {
    const order = await this.ordersService.getOrderDetail(dto.orderId);
    
    if (!order) {
      throw new BadRequestException('Pedido no encontrado');
    }

    // Check if order is still pending payment
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `El pedido ya no está en estado PENDING_PAYMENT. Estado actual: ${order.status}`,
      );
    }

    // Get the frontend URL for redirect URLs
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    const result = await this.mercadoPagoService.createPreference(
      dto.orderId,
      Number(order.total),
      order.items.map((item) => ({
        id: item.productId,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      {
        email: dto.customerEmail,
        name: dto.customerName,
        phone: dto.customerPhone,
      },
      dto.shippingAddress
        ? {
            province: dto.shippingAddress.province,
            city: dto.shippingAddress.city,
            postalCode: dto.shippingAddress.postalCode,
            address: dto.shippingAddress.address,
            number: dto.shippingAddress.number,
          }
        : undefined,
      `${frontendUrl}/checkout/success?orderId=${dto.orderId}`,
      `${frontendUrl}/checkout/failure?orderId=${dto.orderId}`,
      `${frontendUrl}/checkout/pending?orderId=${dto.orderId}`,
    );

    return {
      success: true,
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      publicKey: this.mercadoPagoService.getPublicKey(),
      orderId: dto.orderId,
    };
  }

  @Get('public-key')
  getPublicKey() {
    return {
      publicKey: this.mercadoPagoService.getPublicKey(),
    };
  }
}
