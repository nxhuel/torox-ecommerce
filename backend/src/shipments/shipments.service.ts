import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import {
  SHIPMENT_PROVIDER,
  ShipmentProvider,
  ShipmentQuoteResult,
} from './providers/shipment-provider.interface';
import { Order } from '../orders/entities/order.entity';
import { EnviaProvider, PROVINCE_MAP } from './providers/envia.provider';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    @InjectRepository(Shipment)
    private readonly repo: Repository<Shipment>,
    @Inject(SHIPMENT_PROVIDER)
    private readonly provider: ShipmentProvider,
    private readonly envia: EnviaProvider,
    private readonly productsService: ProductsService,
  ) {}

  // Defaults usados cuando un producto no tiene peso/medidas cargados en el admin.
  private readonly DEFAULT_WEIGHT_KG = 0.5;
  private readonly DEFAULT_WIDTH_CM = 15;
  private readonly DEFAULT_HEIGHT_CM = 10;
  private readonly DEFAULT_LENGTH_CM = 15;

  /**
   * Resuelve el paquete de una lista de items de pedido: peso total
   * (sumado por cantidad), medidas máximas, y valor declarado.
   * Usa defaults cuando un producto no tiene peso/medidas cargados.
   */
  private async resolvePackageFromItems(
    items: { productId: string; quantity: number }[],
  ): Promise<{
    weightKg: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
    declaredValue: number;
    missingData: { productId: string; name: string }[];
  }> {
    let totalWeight = 0;
    let declaredValue = 0;
    let maxWidth = this.DEFAULT_WIDTH_CM;
    let maxHeight = this.DEFAULT_HEIGHT_CM;
    let maxLength = this.DEFAULT_LENGTH_CM;
    const missingData: { productId: string; name: string }[] = [];

    for (const item of items) {
      try {
        const product = await this.productsService.findOne(item.productId);
        if (product.weightKg == null) {
          missingData.push({ productId: item.productId, name: product.name });
        }
        if (product.widthCm == null || product.heightCm == null || product.lengthCm == null) {
          missingData.push({ productId: item.productId, name: product.name });
        }
        totalWeight += (product.weightKg ?? this.DEFAULT_WEIGHT_KG) * item.quantity;
        declaredValue += (product.finalPrice ?? product.price ?? 0) * item.quantity;
        maxWidth = Math.max(maxWidth, product.widthCm ?? this.DEFAULT_WIDTH_CM);
        maxHeight = Math.max(maxHeight, product.heightCm ?? this.DEFAULT_HEIGHT_CM);
        maxLength = Math.max(maxLength, product.lengthCm ?? this.DEFAULT_LENGTH_CM);
      } catch {
        totalWeight += this.DEFAULT_WEIGHT_KG * item.quantity;
      }
    }
    if (totalWeight <= 0) totalWeight = this.DEFAULT_WEIGHT_KG;

    return {
      weightKg: totalWeight,
      widthCm: maxWidth,
      heightCm: maxHeight,
      lengthCm: maxLength,
      declaredValue,
      missingData,
    };
  }

  /**
   * Cotiza el costo de envío para los datos del formulario de checkout.
   * Acepta una lista de {productId, quantity} para calcular el peso total.
   */
  async quoteForOrderData(params: {
    province: string;
    city?: string;
    postalCode: string;
    items: { productId: string; quantity: number }[];
  }): Promise<number> {
    try {
      const { weightKg, widthCm, heightCm, lengthCm, declaredValue, missingData } =
        await this.resolvePackageFromItems(params.items);

      if (missingData.length) {
        this.logger.warn(
          `Algunos productos sin peso/medidas cargados (se usan defaults ${this.DEFAULT_WIDTH_CM}x${this.DEFAULT_HEIGHT_CM}x${this.DEFAULT_LENGTH_CM} cm, ${this.DEFAULT_WEIGHT_KG} kg): %o`,
          missingData.map((m) => `${m.name} (${m.productId})`),
        );
      }

      const result = await this.quote({
        provinceName: params.province,
        city: params.city,
        postalCode: params.postalCode,
        weightKg,
        widthCm,
        heightCm,
        lengthCm,
        declaredValue,
      });
      return result.cost ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Cotiza el costo de envío con Envia.com. Devuelve la opción a domicilio más barata.
   * Si los datos de dimensiones no están disponibles se usan defaults.
   */
  async quote(params: {
    provinceName: string;
    city?: string;
    postalCode: string;
    weightKg?: number;
    widthCm?: number;
    heightCm?: number;
    lengthCm?: number;
    declaredValue?: number;
  }): Promise<ShipmentQuoteResult & { isFree?: boolean }> {
    const provinceCode = PROVINCE_MAP[params.provinceName] ?? 'DF';
    return this.envia.quote({
      provinceCode,
      postalCode: params.postalCode,
      city: params.city,
      weightKg: params.weightKg ?? this.DEFAULT_WEIGHT_KG,
      widthCm: params.widthCm ?? this.DEFAULT_WIDTH_CM,
      heightCm: params.heightCm ?? this.DEFAULT_HEIGHT_CM,
      lengthCm: params.lengthCm ?? this.DEFAULT_LENGTH_CM,
      declaredValue: params.declaredValue,
    });
  }

  /**
   * Calcula los datos de paquete de una orden (peso, dimensiones, valor declarado).
   */
  private async resolvePackage(order: Order): Promise<{
    weightKg: number;
    widthCm: number;
    heightCm: number;
    lengthCm: number;
    declaredValue: number;
  }> {
    const { weightKg, widthCm, heightCm, lengthCm, declaredValue } =
      await this.resolvePackageFromItems(order.items?.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? []);
    return { weightKg, widthCm, heightCm, lengthCm, declaredValue };
  }

  /**
   * Calcula el costo de envío para una orden, teniendo en cuenta el peso real
   * de los productos cargados en el carrito.
   */
  async quoteForOrder(order: Order): Promise<number> {
    try {
      const pkg = await this.resolvePackage(order);
      const address = order.shippingAddress;
      const result = await this.quote({
        provinceName: address.province,
        city: address.city,
        postalCode: address.postalCode,
        weightKg: pkg.weightKg,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
        lengthCm: pkg.lengthCm,
        declaredValue: pkg.declaredValue,
      });
      return result.cost ?? 0;
    } catch {
      return 0;
    }
  }

  async createForOrder(order: Order): Promise<Shipment> {
    const existing = await this.repo.findOne({ where: { orderId: order.id } });
    if (existing) return existing;

    const address = order.shippingAddress;
    const pkg = await this.resolvePackage(order);

    const result = await this.provider.createShipment({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: `${address.address} ${address.number}`.trim(),
      city: address.city,
      postalCode: address.postalCode,
      provinceCode: PROVINCE_MAP[address.province] ?? 'DF',
      weightKg: pkg.weightKg,
      widthCm: pkg.widthCm,
      heightCm: pkg.heightCm,
      lengthCm: pkg.lengthCm,
      declaredValue: pkg.declaredValue,
    });

    const shipment = this.repo.create({
      orderId: order.id,
      trackingNumber: result.trackingNumber,
      carrier: result.carrierName || 'Envia.com',
      status: result.status,
      estimatedDelivery: result.estimatedDelivery,
      events: result.events,
      enviaId: result.enviaId,
      labelUrl: result.labelUrl,
      trackUrl: result.trackingUrl,
    });

    return this.repo.save(shipment);
  }

  async advance(id: string): Promise<Shipment> {
    const shipment = await this.findOne(id);
    const next = this.provider.getNextStatus(shipment.status);
    if (!next) throw new BadRequestException('El envío ya fue entregado');

    shipment.status = next;
    shipment.events = [
      ...(shipment.events || []),
      {
        status: next,
        date: new Date(),
        description: this.getDescription(next),
      },
    ];

    if (next === ShipmentStatus.PICKED_UP) shipment.shippedAt = new Date();
    if (next === ShipmentStatus.DELIVERED) shipment.deliveredAt = new Date();

    return this.repo.save(shipment);
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.repo.findOne({ where: { id }, relations: { order: true } });
    if (!shipment) throw new NotFoundException('Envío no encontrado');
    return shipment;
  }

  async findByOrder(orderId: string): Promise<Shipment | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  async findByTracking(trackingNumber: string): Promise<Shipment> {
    const shipment = await this.repo.findOne({
      where: { trackingNumber },
      relations: { order: true },
    });
    if (!shipment) throw new NotFoundException('Envío no encontrado');
    return shipment;
  }

  async findAll(): Promise<Shipment[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: { order: true } });
  }

  /**
   * Devuelve la URL del PDF de la etiqueta de Envia para imprimir desde el admin.
   * Envia entrega la etiqueta al generar el envío, así que la guardamos en la orden.
   */
  async getLabelUrl(id: string): Promise<string | null> {
    const shipment = await this.findOne(id);
    return shipment.labelUrl ?? null;
  }

  /**
   * Sincroniza el estado del envío consultando la API de Envia (fallback al webhook).
   */
  async syncStatus(id: string): Promise<Shipment> {
    const shipment = await this.findOne(id);
    if (!shipment.trackingNumber) return shipment;

    const remote = await this.envia.getShipmentStatus(shipment.trackingNumber);
    if (!remote) return shipment;

    if (remote.status !== shipment.status) {
      await this.applyStatus(shipment, remote.status, remote.description);
    }
    return shipment;
  }

  /**
   * Procesa el webhook de Envia (type_id 3/4) cuando cambia el estado del envío.
   * El payload trae tracking_number + status.
   */
  async handleTrackingWebhook(
    trackingNumber: string,
    newStatus: string,
    description?: string,
  ): Promise<void> {
    const shipment = await this.repo.findOne({ where: { trackingNumber } });
    if (!shipment) return;

    const mapped = this.envia.mapStatus(newStatus);
    if (mapped === shipment.status) return;

    await this.applyStatus(shipment, mapped, description);
  }

  private async applyStatus(
    shipment: Shipment,
    status: ShipmentStatus,
    description?: string,
  ): Promise<void> {
    shipment.status = status;
    shipment.events = [
      ...(shipment.events || []),
      {
        status,
        date: new Date(),
        description: description || this.getDescription(status),
      },
    ];
    if (status === ShipmentStatus.PICKED_UP && !shipment.shippedAt) {
      shipment.shippedAt = new Date();
    }
    if (status === ShipmentStatus.DELIVERED && !shipment.deliveredAt) {
      shipment.deliveredAt = new Date();
    }
    await this.repo.save(shipment);
  }

  async getPackageDetails(order: Order): Promise<{
    weightKg: number
    widthCm: number
    heightCm: number
    lengthCm: number
    declaredValue: number
  }> {
    const pkg = await this.resolvePackage(order)
    return {
      weightKg: pkg.weightKg,
      widthCm: pkg.widthCm,
      heightCm: pkg.heightCm,
      lengthCm: pkg.lengthCm,
      declaredValue: pkg.declaredValue,
    }
  }

  private getDescription(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.PREPARING:
        return 'El paquete se está preparando en el depósito.';
      case ShipmentStatus.PICKED_UP:
        return 'El paquete fue retirado por el transportista.';
      case ShipmentStatus.IN_TRANSIT:
        return 'El paquete está viajando hacia su destino.';
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 'El paquete está en el reparto, cerca tuyo.';
      case ShipmentStatus.DELIVERED:
        return 'El paquete fue entregado correctamente.';
    }
  }
}
