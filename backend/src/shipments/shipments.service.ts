import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import {
  SHIPMENT_PROVIDER,
  ShipmentProvider,
  BranchInfo,
  EnviaAddress,
  PackageSpec,
  ShippingOption,
} from './providers/shipment-provider.interface';
import { Order, ShippingMethod, ShippingOriginSnapshot } from '../orders/entities/order.entity';
import { EnviaProvider, PROVINCE_MAP } from './providers/envia.provider';
import { ProductsService } from '../products/products.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Clave de configuración donde se guardan las sucursales de origen de Envia,
 * indexadas por carrier (`{ oca: BranchInfo, andreani: BranchInfo }`).
 * Cada paquetería tiene su propia sucursal: el `branch_code` de una sucursal de
 * OCA no sirve para un envío de Andreani.
 */
export const ORIGIN_BRANCHES_SETTING = 'envia_origin_branches';

/** Clave vieja (una sola sucursal para todos los carriers). Se migra sola. */
export const LEGACY_ORIGIN_BRANCH_SETTING = 'envia_origin_branch';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    @InjectRepository(Shipment)
    private readonly repo: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @Inject(SHIPMENT_PROVIDER)
    private readonly provider: ShipmentProvider,
    private readonly envia: EnviaProvider,
    private readonly productsService: ProductsService,
    private readonly settings: SettingsService,
  ) {}

  // Defaults usados cuando un producto no tiene peso/medidas cargados en el admin.
  private readonly DEFAULT_WEIGHT_KG = 0.5;
  private readonly DEFAULT_WIDTH_CM = 15;
  private readonly DEFAULT_HEIGHT_CM = 10;
  private readonly DEFAULT_LENGTH_CM = 15;

  /** Radio (km) de sucursales que se muestran en el mapa del admin. */
  private readonly DEFAULT_RADIUS_KM = 30;

  /** Caché en memoria del mapa de sucursales (evita pegarle a Envia en cada refresh). */
  private mapCache: { key: string; data: unknown; expiresAt: number } | null = null;

  // ─── Paquetes ───────────────────────────────────────────────────────────────

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
    let totalVolume = 0;
    let maxWidth = this.DEFAULT_WIDTH_CM;
    let maxHeight = this.DEFAULT_HEIGHT_CM;
    let maxLength = this.DEFAULT_LENGTH_CM;
    const missingData: { productId: string; name: string }[] = [];

    for (const item of items) {
      try {
        const product = await this.productsService.findOne(item.productId);
        if (
          product.weightKg == null ||
          product.widthCm == null ||
          product.heightCm == null ||
          product.lengthCm == null
        ) {
          missingData.push({ productId: item.productId, name: product.name });
        }
        const w = Number(product.widthCm ?? this.DEFAULT_WIDTH_CM);
        const h = Number(product.heightCm ?? this.DEFAULT_HEIGHT_CM);
        const l = Number(product.lengthCm ?? this.DEFAULT_LENGTH_CM);
        totalWeight += Number(product.weightKg ?? this.DEFAULT_WEIGHT_KG) * item.quantity;
        declaredValue += Number(product.finalPrice ?? product.price ?? 0) * item.quantity;
        totalVolume += w * h * l * item.quantity;
        maxWidth = Math.max(maxWidth, w);
        maxHeight = Math.max(maxHeight, h);
        maxLength = Math.max(maxLength, l);
      } catch {
        totalWeight += this.DEFAULT_WEIGHT_KG * item.quantity;
        totalVolume +=
          this.DEFAULT_WIDTH_CM * this.DEFAULT_HEIGHT_CM * this.DEFAULT_LENGTH_CM * item.quantity;
      }
    }
    if (totalWeight <= 0) totalWeight = this.DEFAULT_WEIGHT_KG;

    // Varias unidades no entran en la caja de una sola: apilamos en altura
    // (base = ancho × largo máximos) para no subdeclarar el volumen, que es
    // lo que usan los correos para el peso volumétrico.
    const stackedHeight = Math.ceil(totalVolume / (maxWidth * maxLength));
    const height = Math.max(maxHeight, stackedHeight);

    return {
      weightKg: Math.round(totalWeight * 100) / 100,
      widthCm: Math.ceil(maxWidth),
      heightCm: height,
      lengthCm: Math.ceil(maxLength),
      declaredValue,
      missingData,
    };
  }

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

  // ─── Origen y destino ───────────────────────────────────────────────────────

  /**
   * Sucursales de origen configuradas, indexadas por carrier. Si quedó guardada
   * la configuración vieja (una sola sucursal) se migra al formato nuevo.
   */
  async getOriginBranches(): Promise<Record<string, BranchInfo>> {
    const map = (await this.settings.get<Record<string, BranchInfo>>(ORIGIN_BRANCHES_SETTING)) ?? {};
    const legacy = await this.settings.get<BranchInfo>(LEGACY_ORIGIN_BRANCH_SETTING);
    if (legacy?.branchCode && legacy.carrier && !map[legacy.carrier]?.branchCode) {
      map[legacy.carrier] = legacy;
      await this.settings.set(ORIGIN_BRANCHES_SETTING, map);
      await this.settings.remove(LEGACY_ORIGIN_BRANCH_SETTING);
    }
    return map;
  }

  /**
   * Dirección de origen de los envíos para un carrier concreto. Si el admin
   * definió una sucursal de Envia para esa paquetería, el paquete se deja ahí y
   * desde ahí se despacha; si no, se usa la dirección configurada en el .env.
   */
  async resolveOriginForCarrier(
    carrier: string,
  ): Promise<{ address: EnviaAddress; branch: BranchInfo | null }> {
    const envOrigin = this.envia.envOrigin();
    const map = await this.getOriginBranches();
    const branch = map[carrier];
    if (!branch?.branchCode) {
      return { address: envOrigin, branch: null };
    }
    return { address: this.branchToAddress(branch, envOrigin), branch };
  }

  /** Convierte una sucursal de Envia en la dirección de origen que espera la API. */
  private branchToAddress(branch: BranchInfo, envOrigin: EnviaAddress): EnviaAddress {
    return {
      name: branch.reference || envOrigin.name,
      company: envOrigin.company,
      email: envOrigin.email,
      phone: branch.phone || envOrigin.phone,
      street: branch.address?.street || '',
      number: branch.address?.number,
      city: branch.address?.city || envOrigin.city,
      state: branch.address?.state || envOrigin.state,
      country: 'AR',
      postalCode: branch.address?.postalCode || envOrigin.postalCode,
      branchCode: branch.branchCode,
    };
  }

  /**
   * Orígenes a usar para cotizar. Sólo se cotizan los carriers con sucursal de
   * origen configurada: el paquete se deja en esa sucursal y desde ahí el
   * carrier lo lleva hasta la casa del comprador.
   */
  private async buildOrigins(carriers: string[]): Promise<{
    origins: Record<string, EnviaAddress>;
    branches: Record<string, BranchInfo>;
    carriers: string[];
  }> {
    const envOrigin = this.envia.envOrigin();
    const map = await this.getOriginBranches();
    // Todos los carriers se cotizan. Si el admin configuró una sucursal de
    // origen para un carrier, se cotiza desde ahí (eso habilita las
    // modalidades "desde sucursal"); si no, desde la dirección del .env.
    const list = carriers;

    const origins: Record<string, EnviaAddress> = {};
    const branches: Record<string, BranchInfo> = {};
    for (const carrier of list) {
      const branch = map[carrier];
      if (branch?.branchCode) {
        origins[carrier] = this.branchToAddress(branch, envOrigin);
        branches[carrier] = branch;
      } else {
        origins[carrier] = envOrigin;
      }
    }
    return { origins, branches, carriers: list };
  }

  /** Carriers con los que se cotiza (los configurados en el .env o todos los de Envia). */
  private async resolveCarriers(): Promise<string[]> {
    const configured = this.envia.getCarrierSlugs();
    if (configured?.length) return configured;
    const all = await this.envia.getCarriers();
    return all.map((c) => c.name);
  }

  private buildDestination(params: {
    province: string;
    city?: string;
    postalCode: string;
    address?: string;
    number?: string;
    name?: string;
    phone?: string;
    email?: string;
    branchCode?: string;
  }): EnviaAddress {
    return {
      name: params.name || 'Cliente',
      phone: params.phone || '',
      email: params.email || '',
      street: params.address || '',
      number: params.number,
      city: params.city || '',
      state: PROVINCE_MAP[params.province] ?? 'DF',
      country: 'AR',
      postalCode: params.postalCode || '',
      branchCode: params.branchCode,
    };
  }

  // ─── Cotización ─────────────────────────────────────────────────────────────

  /**
   * Cotiza todas las opciones de envío disponibles para una dirección.
   * Cada opción trae carrier, servicio, modalidad (domicilio / sucursal),
   * precio real de Envia y tiempo estimado, para que el comprador elija.
   */
  async quoteOptions(params: {
    province: string;
    city?: string;
    postalCode: string;
    address?: string;
    number?: string;
    items: { productId: string; quantity: number }[];
  }): Promise<ShippingOption[]> {
    const { options } = await this.quoteWithOrigins(params);
    return options;
  }

  /**
   * Igual que `quoteOptions` pero además devuelve el origen usado por cada
   * carrier: así el pedido puede guardar el origen con el que se cotizó y la
   * etiqueta se genera siempre desde el mismo lugar.
   */
  private async quoteWithOrigins(params: {
    province: string;
    city?: string;
    postalCode: string;
    address?: string;
    number?: string;
    items: { productId: string; quantity: number }[];
  }): Promise<{
    options: ShippingOption[];
    origins: Record<string, EnviaAddress>;
    branches: Record<string, BranchInfo>;
  }> {
    const pkg = await this.resolvePackageFromItems(params.items);
    if (pkg.missingData.length) {
      this.logger.warn(
        `Algunos productos sin peso/medidas cargados (se usan defaults ${this.DEFAULT_WIDTH_CM}x${this.DEFAULT_HEIGHT_CM}x${this.DEFAULT_LENGTH_CM} cm, ${this.DEFAULT_WEIGHT_KG} kg): %o`,
        pkg.missingData.map((m) => `${m.name} (${m.productId})`),
      );
    }

    const carriers = await this.resolveCarriers();
    const { origins, branches } = await this.buildOrigins(carriers);
    const destination = this.buildDestination(params);
    const packages: PackageSpec[] = [
      {
        weightKg: pkg.weightKg,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
        lengthCm: pkg.lengthCm,
        declaredValue: pkg.declaredValue,
        content: 'Producto',
      },
    ];

    const options = await this.envia.quoteOptions({
      origins,
      fallbackOrigin: this.envia.envOrigin(),
      destination,
      packages,
      carriers: Object.keys(origins),
    });

    return { options, origins, branches };
  }

  /**
   * Resuelve la opción de envío que se guarda en la orden. Recotiza en el
   * servidor (el precio siempre es el real de Envia, nunca el que manda el
   * cliente) y valida que la sucursal elegida pertenezca a la opción.
   *
   * Devuelve también el origen con el que se cotizó (la sucursal de origen del
   * carrier elegido) para congelarlo en el pedido.
   */
  async resolveShippingOption(params: {
    province: string;
    city?: string;
    postalCode: string;
    address?: string;
    number?: string;
    items: { productId: string; quantity: number }[];
    optionId?: string;
    branchCode?: string;
    branchCarrier?: string;
  }): Promise<{
    option: ShippingOption;
    branch: BranchInfo | null;
    origin: EnviaAddress;
    originBranch: BranchInfo | null;
  }> {
    const { options, origins, branches } = await this.quoteWithOrigins({
      province: params.province,
      city: params.city,
      postalCode: params.postalCode,
      address: params.address,
      number: params.number,
      items: params.items,
    });

    if (!options.length) {
      throw new BadRequestException('No hay opciones de envío disponibles para esa dirección.');
    }

    const option = params.optionId
      ? options.find((o) => o.id === params.optionId)
      : options[0];

    if (!option) {
      throw new BadRequestException(
        'La opción de envío elegida ya no está disponible. Volvé a cotizar.',
      );
    }

    let branch: BranchInfo | null = null;
    if (option.deliveryMode === 'BRANCH') {
      if (!params.branchCode) {
        throw new BadRequestException('Elegí la sucursal donde retirás el paquete.');
      }
      branch =
        option.branches.find(
          (b) =>
            b.branchCode === params.branchCode &&
            (!params.branchCarrier || b.carrier === params.branchCarrier),
        ) ?? null;
      if (!branch) {
        throw new BadRequestException('La sucursal elegida no está disponible para ese envío.');
      }
    }

    const origin = origins[option.carrier] ?? this.envia.envOrigin();

    return { option, branch, origin, originBranch: branches[option.carrier] ?? null };
  }

  /** Costo de envío de una orden ya persistida (usa la opción que se eligió). */
  async quoteForOrder(order: Order): Promise<number> {
    if (order.shippingMethod === ShippingMethod.PICKUP) return 0;
    if (order.shippingOption?.cost != null) return Number(order.shippingOption.cost);
    try {
      const pkg = await this.resolvePackage(order);
      const address = order.shippingAddress;
      const options = await this.quoteOptions({
        province: address.province,
        city: address.city,
        postalCode: address.postalCode,
        address: address.address,
        number: address.number,
        items: order.items?.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [],
      });
      return options[0]?.cost ?? 0;
    } catch {
      return 0;
    }
  }

  // ─── Sucursales y mapa (admin) ──────────────────────────────────────────────

  /**
   * Datos para el mapa del admin: dirección de TOROX (pin azul) y las
   * sucursales de Envia cercanas (pines rojos).
   */
  async getMapData(
    params: { carrier?: string; type?: 1 | 2 | 3; limit?: number; radiusKm?: number } = {},
  ) {
    const cacheKey = `${params.carrier ?? ''}|${params.type ?? 3}|${params.limit ?? 25}|${params.radiusKm ?? this.DEFAULT_RADIUS_KM}`;
    if (
      this.mapCache &&
      this.mapCache.key === cacheKey &&
      this.mapCache.expiresAt > Date.now()
    ) {
      return this.mapCache.data;
    }
    const data = await this.buildMapData(params);
    this.mapCache = { key: cacheKey, data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
  }

  private async buildMapData(params: {
    carrier?: string;
    type?: 1 | 2 | 3;
    limit?: number;
    radiusKm?: number;
  }) {
    const envOrigin = this.envia.envOrigin();
    const originBranches = Object.values(await this.getOriginBranches());
    const coords = await this.envia.geocode(envOrigin);

    const configured = this.envia.getCarrierSlugs();
    const carriers = params.carrier
      ? [params.carrier]
      : configured ?? (await this.envia.getCarriers()).map((c) => c.name);

    const results = await Promise.allSettled(
      carriers.map((carrier) =>
        this.envia.getBranches({
          carrier,
          type: params.type ?? 3,
          zipcode: envOrigin.postalCode,
          city: envOrigin.city,
          state: envOrigin.state,
          limit: params.limit ?? 25,
        }),
      ),
    );

    const branches: BranchInfo[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        branches.push(...result.value);
      } else {
        this.logger.warn(
          `No se pudieron listar sucursales de ${carriers[index]}: ${result.reason?.message}`,
        );
      }
    });

    branches.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));

    // Envia devuelve sucursales de todo el país y en muchas de ellas no viene
    // la distancia: la calculamos nosotros a partir de las coordenadas para
    // que el mapa muestre sólo lo que de verdad está cerca del local.
    const originLat = coords?.latitude ?? null;
    const originLng = coords?.longitude ?? null;
    for (const branch of branches) {
      const lat = branch.address?.latitude;
      const lng = branch.address?.longitude;
      if (branch.distanceKm == null && lat != null && lng != null && originLat != null && originLng != null) {
        branch.distanceKm = this.distanceKm(originLat, originLng, lat, lng);
      }
    }
    branches.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));

    // Para el mapa y el listado nos quedamos sólo con las que están cerca.
    const radius = params.radiusKm ?? this.DEFAULT_RADIUS_KM;
    const near = branches.filter(
      (b) => b.distanceKm == null || b.distanceKm <= radius,
    );
    const nearby = near.length ? near : branches.slice(0, 10);

    return {
      origin: {
        ...envOrigin,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        geocodeSource: coords?.source ?? null,
      },
      /** Sucursal de origen configurada para cada paquetería. */
      originBranches,
      branches: nearby,
      totalBranches: branches.length,
      radiusKm: radius,
      carriers: await this.envia.getEnabledCarriers(),
      configuredCarriers: configured ?? [],
      environment: {
        apiBase: this.envia.apiBase,
        queriesBase: this.envia.queriesBase,
        isSandbox: this.envia.isSandbox,
      },
    };
  }

  /** Distancia en línea recta entre dos coordenadas (km). */
  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /**
   * Guarda la sucursal donde el administrador deja los paquetes. La sucursal
   * queda asignada a SU paquetería: el `branch_code` de una sucursal de OCA no
   * sirve para un envío de Andreani.
   */
  async setOriginBranch(branch: BranchInfo): Promise<BranchInfo> {
    if (!branch?.branchCode) {
      throw new BadRequestException('La sucursal de origen no tiene código.');
    }
    if (!branch.carrier) {
      throw new BadRequestException('La sucursal de origen necesita su paquetería (carrier).');
    }
    const map = await this.getOriginBranches();
    map[branch.carrier] = branch;
    await this.settings.set(ORIGIN_BRANCHES_SETTING, map);
    await this.settings.remove(LEGACY_ORIGIN_BRANCH_SETTING);
    this.mapCache = null;
    return branch;
  }

  /**
   * Vuelve a usar la dirección del .env como origen. Si se pasa un carrier sólo
   * se borra el origen de esa paquetería.
   */
  async clearOriginBranch(carrier?: string): Promise<void> {
    if (carrier) {
      const map = await this.getOriginBranches();
      delete map[carrier];
      await this.settings.set(ORIGIN_BRANCHES_SETTING, map);
      this.logger.warn(`Origen de envíos quitado para ${carrier}.`);
    } else {
      await this.settings.remove(ORIGIN_BRANCHES_SETTING);
      await this.settings.remove(LEGACY_ORIGIN_BRANCH_SETTING);
      this.logger.warn(
        'Origen de envíos quitado por completo: sin sucursal de origen no se pueden cotizar entregas a domicilio.',
      );
    }
    this.mapCache = null;
  }

  // ─── Envíos ─────────────────────────────────────────────────────────────────

  async createForOrder(order: Order): Promise<Shipment | null> {
    const existing = await this.repo.findOne({ where: { orderId: order.id } });
    if (existing) return existing;

    // Los pedidos con retiro en el local de TOROX no generan guía de envío.
    if (order.shippingMethod === ShippingMethod.PICKUP) return null;

    const address = order.shippingAddress;
    const pkg = await this.resolvePackage(order);

    // Si la orden no tiene opción de envío guardada (pedidos antiguos), se
    // cotiza al momento y se usa la opción más barata.
    let option = order.shippingOption;
    if (!option) {
      const options = await this.quoteOptions({
        province: address.province,
        city: address.city,
        postalCode: address.postalCode,
        address: address.address,
        number: address.number,
        items: order.items?.map((i) => ({ productId: i.productId, quantity: i.quantity })) ?? [],
      });
      const cheapest = options[0];
      if (!cheapest) {
        throw new BadRequestException('Envia.com no devolvió cotizaciones para este pedido.');
      }
      option = {
        id: cheapest.id,
        carrier: cheapest.carrier,
        carrierName: cheapest.carrierName,
        service: cheapest.service,
        serviceDescription: cheapest.serviceDescription,
        dropOff: cheapest.dropOff,
        dropOffDescription: cheapest.dropOffDescription,
        deliveryMode: cheapest.deliveryMode,
        pickupMode: cheapest.pickupMode,
        cost: cheapest.cost,
        currency: cheapest.currency,
        deliveryEstimate: cheapest.deliveryEstimate,
        deliveryDate: cheapest.deliveryDate,
      };
    }

    const destination = this.buildDestination({
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      address: `${address.address} ${address.number ?? ''}`.trim(),
      number: address.number,
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      branchCode: order.shippingBranch?.branchCode,
    });

    // El origen está congelado en el pedido: la etiqueta sale siempre desde la
    // misma sucursal con la que se cotizó (aunque el admin después cambie el
    // origen configurado). Los pedidos viejos, sin origen guardado, usan el
    // origen vigente del carrier.
    let origin = order.shippingOrigin
      ? this.snapshotToAddress(order.shippingOrigin)
      : (await this.resolveOriginForCarrier(option.carrier)).address;
    // En las modalidades con origen "puerta" (0 y 2) la guía sale desde la
    // dirección de TOROX, no desde la sucursal configurada.
    if ((option.dropOff ?? 0) === 0 || option.dropOff === 2) {
      origin = this.envia.envOrigin();
    }

    const result = await this.provider.createShipment({
      orderNumber: order.orderNumber,
      origin,
      destination,
      package: {
        weightKg: pkg.weightKg,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
        lengthCm: pkg.lengthCm,
        declaredValue: pkg.declaredValue,
        content: 'Producto',
      },
      carrier: option.carrier,
      service: option.service,
      dropOff: option.dropOff,
      declaredValue: pkg.declaredValue,
    });

    const shipment = this.repo.create({
      orderId: order.id,
      trackingNumber: result.trackingNumber,
      carrier: option.carrierName || result.carrierName || 'Envia.com',
      service: option.service ?? null,
      dropOff: option.dropOff ?? null,
      branchCode: order.shippingBranch?.branchCode ?? null,
      branchAddress: order.shippingBranch
        ? [
            order.shippingBranch.address?.street,
            order.shippingBranch.address?.number,
            order.shippingBranch.address?.city,
          ]
            .filter(Boolean)
            .join(' ')
        : null,
      originAddress: [
        origin.street,
        origin.number,
        origin.city,
      ]
        .filter(Boolean)
        .join(' '),
      originBranchCode: origin.branchCode ?? null,
      declaredValue: pkg.declaredValue,
      packageInfo: {
        weightKg: pkg.weightKg,
        widthCm: pkg.widthCm,
        heightCm: pkg.heightCm,
        lengthCm: pkg.lengthCm,
      },
      status: result.status,
      estimatedDelivery: result.estimatedDelivery,
      events: result.events,
      enviaId: result.enviaId,
      labelUrl: result.labelUrl,
      trackUrl: result.trackingUrl,
    });

    return this.repo.save(shipment);
  }

  /** Convierte el origen congelado del pedido en la dirección que espera Envia. */
  private snapshotToAddress(snapshot: ShippingOriginSnapshot): EnviaAddress {
    const address = snapshot.address ?? ({} as EnviaAddress);
    return {
      name: address.name ?? 'TOROX',
      company: address.company,
      email: address.email,
      phone: address.phone,
      street: address.street ?? '',
      number: address.number,
      city: address.city ?? '',
      state: address.state ?? 'DF',
      country: address.country ?? 'AR',
      postalCode: address.postalCode ?? '',
      branchCode: snapshot.branchCode ?? address.branchCode,
    };
  }

  // ─── Cambiar el correo de un pedido (admin) ────────────────────────────────

  /** Carga un pedido al que todavía se le puede cambiar el correo. */
  private async loadOrderForCarrierChange(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: { items: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.shippingMethod === ShippingMethod.PICKUP) {
      throw new BadRequestException('Este pedido se retira en el local: no tiene correo.');
    }
    const existing = await this.repo.findOne({ where: { orderId } });
    if (existing) {
      throw new BadRequestException(
        'El pedido ya tiene una guía generada. Anulala primero para poder cambiar el correo.',
      );
    }
    return order;
  }

  /**
   * Opciones de envío disponibles hoy para la dirección y los productos de un
   * pedido ya pagado. Sólo entrega a domicilio (el comprador eligió domicilio).
   */
  async optionsForOrder(orderId: string) {
    const order = await this.loadOrderForCarrierChange(orderId);
    const address = order.shippingAddress;
    const options = await this.quoteOptions({
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      address: address.address,
      number: address.number,
      items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    return {
      current: order.shippingOption ?? null,
      chargedShipping: Number(order.shippingCost ?? 0),
      options: options.filter((o) => o.deliveryMode === 'HOME'),
    };
  }

  /**
   * Cambia el correo/servicio de un pedido antes de generar la guía. Lo que el
   * cliente pagó NO cambia: si el correo nuevo cuesta más, la diferencia la
   * absorbe TOROX (queda anotada en las notas del pedido).
   */
  async changeOrderOption(orderId: string, optionId: string) {
    const order = await this.loadOrderForCarrierChange(orderId);
    const address = order.shippingAddress;
    const { options, origins, branches } = await this.quoteWithOrigins({
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      address: address.address,
      number: address.number,
      items: order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
    const option = options.find((o) => o.id === optionId);
    if (!option) {
      throw new BadRequestException('Esa opción de envío ya no está disponible. Volvé a cargar las opciones.');
    }
    if (option.deliveryMode !== 'HOME') {
      throw new BadRequestException('Sólo se puede cambiar a otra entrega a domicilio.');
    }

    const previous = order.shippingOption;
    order.shippingOption = {
      id: option.id,
      carrier: option.carrier,
      carrierName: option.carrierName,
      service: option.service,
      serviceDescription: option.serviceDescription,
      dropOff: option.dropOff,
      dropOffDescription: option.dropOffDescription,
      deliveryMode: option.deliveryMode,
      pickupMode: option.pickupMode,
      cost: option.cost,
      currency: option.currency,
      deliveryEstimate: option.deliveryEstimate,
      deliveryDate: option.deliveryDate,
    };
    const origin = origins[option.carrier] ?? this.envia.envOrigin();
    const branch = branches[option.carrier];
    order.shippingOrigin = {
      carrier: option.carrier,
      branchCode: origin.branchCode ?? null,
      reference: branch?.reference ?? null,
      address: {
        name: origin.name,
        company: origin.company,
        email: origin.email,
        phone: origin.phone,
        street: origin.street,
        number: origin.number,
        city: origin.city,
        state: origin.state,
        country: origin.country,
        postalCode: origin.postalCode,
        ...(origin.branchCode ? { branchCode: origin.branchCode } : {}),
      },
    };

    const stamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const charged = Number(order.shippingCost ?? 0);
    const diff = Math.round((option.cost - charged) * 100) / 100;
    const note =
      `[${stamp}] Correo cambiado por el admin: ` +
      `${previous ? `${previous.carrierName} ${previous.service}` : 'sin correo'} → ${option.carrierName} ${option.service} ` +
      `($${option.cost}). El cliente pagó $${charged} de envío` +
      (diff > 0 ? `; diferencia a cargo de TOROX: $${diff}.` : '.');
    order.notes = order.notes ? `${order.notes}\n${note}` : note;
    await this.orderRepo.save(order);
    this.logger.warn(`Pedido ${order.orderNumber}: ${note}`);
    return { shippingOption: order.shippingOption, chargedShipping: charged, difference: diff };
  }

  /**
   * Genera (o reintenta generar) la guía de un pedido puntual. Se usa desde el
   * admin cuando el envío no se pudo crear al aprobar el pago.
   */
  async createForOrderById(orderId: string): Promise<Shipment> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    let shipment: Shipment | null;
    try {
      shipment = await this.createForOrder(order);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException(
        `No se pudo generar la guía: ${this.envia.describeError(error)}`,
      );
    }
    if (!shipment) {
      throw new BadRequestException(
        'Este pedido se retira en el local de TOROX: no genera guía de envío.',
      );
    }
    return shipment;
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
   * Descarga el PDF de la etiqueta desde Envia para que el admin la baje con
   * un nombre útil (TORX-000123-etiqueta.pdf). El PDF vive en los servidores
   * de Envia: el backend lo trae y lo devuelve como adjunto.
   */
  async getLabelFile(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const shipment = await this.findOne(id);
    const url = shipment.labelUrl;
    if (!url) {
      throw new BadRequestException(
        'Este envío todavía no tiene etiqueta. Generá la guía en Envia.com primero.',
      );
    }

    let buffer: Buffer;
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      const data = Buffer.from(await response.arrayBuffer());
      if (contentType.includes('text/html') || data.subarray(0, 4).toString() !== '%PDF') {
        throw new Error('Envia no devolvió un PDF');
      }
      buffer = data;
    } catch (error: any) {
      throw new BadRequestException(
        `No se pudo descargar la etiqueta de Envia (${error?.message}). Abrila desde el panel de Envia.com.`,
      );
    }

    const order = await this.orderRepo.findOne({ where: { id: shipment.orderId } });
    const filename = `${order?.orderNumber ?? shipment.trackingNumber}-etiqueta.pdf`;
    return { buffer, filename };
  }

  /**
   * Sincroniza el estado del envío consultando la API de Envia (fallback al webhook).
   */
  async syncStatus(id: string): Promise<Shipment> {
    const shipment = await this.findOne(id);
    if (!shipment.trackingNumber) return shipment;

    const remote = await this.envia.getShipmentStatus(shipment.trackingNumber);
    if (!remote) {
      throw new BadRequestException(
        'Envia no devolvió información de seguimiento para esta guía todavía.',
      );
    }

    if (remote.status && remote.status !== shipment.status) {
      await this.applyStatus(shipment, remote.status, remote.description);
    } else if (!remote.status) {
      await this.recordIncident(shipment, remote.rawStatus, remote.description);
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
    if (!shipment) {
      this.logger.warn(`Webhook Envia para una guía que no existe en TOROX: ${trackingNumber}`);
      return;
    }

    const mapped = this.envia.mapStatus(newStatus);
    if (!mapped) {
      // Incidencia (intento fallido, devolución, retenido…): se registra sin
      // mover el estado, para que el admin la vea en el pedido.
      await this.recordIncident(shipment, newStatus, description);
      return;
    }
    if (mapped === shipment.status) return;
    // Los webhooks pueden llegar desordenados: nunca retrocedemos el estado.
    if (this.statusRank(mapped) < this.statusRank(shipment.status)) {
      this.logger.log(
        `Webhook Envia ignorado por ser anterior al estado actual (${shipment.status} ← ${mapped}) para ${trackingNumber}`,
      );
      return;
    }

    await this.applyStatus(shipment, mapped, description);
  }

  private statusRank(status: ShipmentStatus): number {
    return [
      ShipmentStatus.PREPARING,
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
      ShipmentStatus.DELIVERED,
    ].indexOf(status);
  }

  /** Agrega un evento de incidencia al historial sin cambiar el estado. */
  private async recordIncident(
    shipment: Shipment,
    rawStatus?: string,
    description?: string,
  ): Promise<void> {
    const text = `Novedad del correo: ${description || rawStatus || 'sin detalle'}`;
    const last = shipment.events?.[shipment.events.length - 1];
    if (last?.description === text) return; // evita duplicados
    shipment.events = [
      ...(shipment.events || []),
      { status: shipment.status, date: new Date(), description: text },
    ];
    await this.repo.save(shipment);
  }

  /**
   * Anula la guía en Envia (reintegro del costo de la etiqueta) y libera el
   * pedido para poder generar una nueva. Sólo si el paquete todavía no fue
   * despachado. La guía anulada queda anotada en las notas del pedido.
   */
  async cancelShipment(id: string): Promise<{ cancelled: true; balanceReturned?: boolean }> {
    const shipment = await this.findOne(id);
    if (shipment.status !== ShipmentStatus.PREPARING) {
      throw new BadRequestException(
        'Sólo se pueden anular guías que todavía no fueron despachadas.',
      );
    }
    const order = await this.orderRepo.findOne({ where: { id: shipment.orderId } });
    const carrierSlug = order?.shippingOption?.carrier ?? order?.shippingOrigin?.carrier;
    if (!carrierSlug) {
      throw new BadRequestException(
        'No se pudo determinar la paquetería de este envío. Anulalo desde el panel de Envia.com.',
      );
    }

    let result: { cancelled: boolean; balanceReturned?: boolean };
    try {
      result = await this.envia.cancelShipment({
        carrier: carrierSlug,
        trackingNumber: shipment.trackingNumber,
      });
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? 'Envia no pudo anular la guía.');
    }

    if (order) {
      const stamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      const note = `[${stamp}] Guía ${shipment.trackingNumber} (${shipment.carrier}) anulada en Envia.`;
      order.notes = order.notes ? `${order.notes}\n${note}` : note;
      await this.orderRepo.save(order);
    }
    await this.repo.remove(shipment);
    this.logger.warn(`Guía ${shipment.trackingNumber} anulada en Envia.`);
    return { cancelled: true, balanceReturned: result.balanceReturned };
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
