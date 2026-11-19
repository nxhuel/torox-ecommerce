import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ShipmentsService } from './shipments.service';
import { EnviaProvider } from './providers/envia.provider';
import { QuoteShipmentDto } from './dto/quote-shipment.dto';
import { OriginBranchDto } from './dto/origin-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly service: ShipmentsService,
    private readonly envia: EnviaProvider,
  ) {}

  // ─── Endpoints públicos ──────────────────────────────────────────────────────

  /** Tracking de un envío por número de seguimiento (público). */
  @Get('tracking/:trackingNumber')
  getByTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.service.findByTracking(trackingNumber);
  }

  /**
   * Cotización de envío en tiempo real con Envia.com.
   * Devuelve TODAS las opciones disponibles (carrier + servicio + modalidad)
   * con su precio real, para que el comprador elija.
   *
   * POST /shipments/quote
   * { province, city, postalCode, address, number, items: [{ productId, quantity }] }
   */
  @Post('quote')
  async quote(@Body() dto: QuoteShipmentDto) {
    const options = await this.service.quoteOptions({
      province: dto.province,
      city: dto.city,
      postalCode: dto.postalCode,
      address: dto.address,
      number: dto.number,
      items: dto.items,
    });
    return {
      options,
      cost: options.length ? Math.min(...options.map((o) => o.cost)) : 0,
      currency: options[0]?.currency ?? 'ARS',
    };
  }

  /**
   * Sucursales de un carrier cerca de una dirección (retiro en sucursal).
   * GET /shipments/branches?carrier=andreani&type=2&zipcode=1824&city=Lanus
   */
  @Get('branches')
  async branches(
    @Query('carrier') carrier: string,
    @Query('type') type?: string,
    @Query('zipcode') zipcode?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
  ) {
    if (!carrier) {
      throw new BadRequestException('carrier es requerido');
    }
    const branchType = type === '1' || type === '2' || type === '3' ? (Number(type) as 1 | 2 | 3) : 3;
    return this.envia.getBranches({
      carrier,
      type: branchType,
      zipcode,
      city,
      state,
    });
  }

  // ─── Endpoints de admin ──────────────────────────────────────────────────────

  /**
   * Datos del mapa: dirección de TOROX (pin azul) + sucursales de Envia
   * cercanas (pines rojos).
   */
  @Get('map')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  mapData(
    @Query('carrier') carrier?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const branchType = type === '1' || type === '2' || type === '3' ? (Number(type) as 1 | 2 | 3) : 3;
    return this.service.getMapData({
      carrier,
      type: branchType,
      limit: limit ? parseInt(limit, 10) : undefined,
      radiusKm: radiusKm ? parseInt(radiusKm, 10) : undefined,
    });
  }

  /** Carriers disponibles en Argentina (para los filtros del mapa). */
  @Get('carriers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  carriers() {
    return this.envia.getEnabledCarriers();
  }

  /**
   * Define la sucursal de Envia donde se dejan los paquetes (origen de los
   * envíos) para la paquetería de esa sucursal.
   */
  @Post('origin-branch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setOriginBranch(@Body() dto: OriginBranchDto) {
    return this.service.setOriginBranch({
      branchCode: dto.branchCode,
      branchId: dto.branchId,
      carrier: dto.carrier,
      carrierName: dto.carrierName,
      reference: dto.reference,
      type: dto.type ?? 'ORIGIN',
      address: dto.address ?? {},
      distanceKm: dto.distanceKm,
      phone: dto.phone,
      hours: dto.hours,
    });
  }

  /**
   * Vuelve a usar la dirección del .env como origen de los envíos.
   * `?carrier=oca` borra sólo el origen de esa paquetería.
   */
  @Delete('origin-branch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async clearOriginBranch(@Query('carrier') carrier?: string) {
    await this.service.clearOriginBranch(carrier);
    return { cleared: true, carrier: carrier ?? null };
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

  /**
   * Genera la guía en Envia.com para un pedido (o reintenta si falló al
   * aprobarse el pago). El carrier y el servicio son los que eligió el comprador.
   */
  @Post('order/:orderId/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  generateForOrder(@Param('orderId') orderId: string) {
    return this.service.createForOrderById(orderId);
  }

  /** Opciones de correo disponibles para un pedido sin guía (admin). */
  @Get('order/:orderId/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  optionsForOrder(@Param('orderId') orderId: string) {
    return this.service.optionsForOrder(orderId);
  }

  /** Cambia el correo de un pedido antes de generar la guía (admin). */
  @Post('order/:orderId/option')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  changeOrderOption(@Param('orderId') orderId: string, @Body() body: { optionId: string }) {
    if (!body?.optionId) throw new BadRequestException('optionId es requerido');
    return this.service.changeOrderOption(orderId, body.optionId);
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

  /**
   * Descarga la etiqueta PDF de Enva como adjunto (TORX-000123-etiqueta.pdf).
   * El PDF vive en los servidores de Envia: el backend lo trae y lo devuelve.
   */
  @Get(':id/label/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async downloadLabel(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.getLabelFile(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  /**
   * Anula la guía en Envia (pide el reintegro del costo de la etiqueta) y
   * libera el pedido para generar una nueva. Sólo antes del despacho.
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cancel(@Param('id') id: string) {
    return this.service.cancelShipment(id);
  }

  /** Sincroniza el estado del envío consultando la API de Envia. */
  @Post(':id/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  sync(@Param('id') id: string) {
    return this.service.syncStatus(id);
  }
}
