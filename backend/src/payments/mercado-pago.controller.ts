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
import { MercadoPagoSyncService } from './mercado-pago-sync.service';

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
    private readonly sync: MercadoPagoSyncService,
  ) {}

  /**
   * Al volver de Mercado Pago, el front llama a este endpoint para confirmar el
   * pago consultando directamente a MP. No confía en lo que manda el navegador:
   * sólo usa el orderId para buscar el pago real en Mercado Pago.
   */
  @Post('confirm/:orderId')
  async confirm(@Param('orderId') orderId: string) {
    const status = await this.sync.confirmOrder(orderId);
    return { status };
  }

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
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
    
    const result = await this.mercadoPagoService.createPreference(
      dto.orderId,
      Number(order.total),
      this.buildPreferenceItems(order),
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

  /**
   * Ítems que se le cobran en Mercado Pago. MP cobra la SUMA de los ítems (no
   * un "total"), así que el envío tiene que ir como un ítem más. Antes sólo se
   * mandaban los productos y el comprador pagaba sin el costo de envío.
   *
   * Si el pedido tiene descuento, MP no acepta precios negativos: se manda un
   * único ítem con el total exacto del pedido.
   */
  private buildPreferenceItems(order: any) {
    const round = (n: number) => Math.round(n * 100) / 100;
    const total = round(Number(order.total));
    const shipping = round(Number(order.shippingCost ?? 0));
    const items = order.items.map((item: any) => ({
      id: item.productId,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      unitPrice: round(Number(item.unitPrice)),
    }));
    if (shipping > 0) {
      items.push({
        id: 'envio',
        name: `Envío ${order.shippingOption?.carrierName ?? ''}`.trim(),
        image: undefined,
        quantity: 1,
        unitPrice: shipping,
      });
    }
    const sum = round(items.reduce((acc: number, i: any) => acc + i.unitPrice * i.quantity, 0));
    if (Math.abs(sum - total) > 0.01) {
      return [
        {
          id: order.id,
          name: `Pedido TOROX ${order.orderNumber ?? ''}`.trim(),
          image: order.items[0]?.image,
          quantity: 1,
          unitPrice: total,
        },
      ];
    }
    return items;
  }

  @Get('public-key')
  getPublicKey() {
    return {
      publicKey: this.mercadoPagoService.getPublicKey(),
    };
  }
}
