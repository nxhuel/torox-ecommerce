import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly service: ShipmentsService) {}

  // ─── Endpoints públicos ──────────────────────────────────────────────────────

  /** Tracking de un envío por número de seguimiento (público). */
  @Get('tracking/:trackingNumber')
  getByTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.service.findByTracking(trackingNumber);
  }

  /**
   * Cotización de envío en tiempo real con Envia.com.
   * Se llama desde el checkout cuando el cliente ingresa su CP y provincia.
   *
   * GET /shipments/quote?province=Buenos+Aires&city=Cordoba&postalCode=5000&weightKg=1.5
   */
  @Get('quote')
  async quote(
    @Query('province') province: string,
    @Query('postalCode') postalCode: string,
    @Query('city') city?: string,
    @Query('weightKg') weightKg?: string,
    @Query('widthCm') widthCm?: string,
    @Query('heightCm') heightCm?: string,
    @Query('lengthCm') lengthCm?: string,
  ) {
    if (!province || !postalCode) {
      throw new BadRequestException('province y postalCode son requeridos');
    }
    return this.service.quote({
      provinceName: province,
      city,
      postalCode,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      widthCm: widthCm ? parseFloat(widthCm) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      lengthCm: lengthCm ? parseFloat(lengthCm) : undefined,
    });
  }

  // ─── Endpoints de admin ──────────────────────────────────────────────────────

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

  /** Obtiene la URL de la etiqueta PDF de Envia para imprimir. */
  @Get(':id/label')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getLabel(@Param('id') id: string) {
    const url = await this.service.getLabelUrl(id);
    return { url };
  }

  /** Sincroniza el estado del envío consultando la API de Envia. */
  @Post(':id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sync(@Param('id') id: string) {
    return this.service.syncStatus(id);
  }
}
