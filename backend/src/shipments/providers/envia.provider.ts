import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import {
  ShipmentProvider,
  CreateShipmentInput,
  ShipmentCreationResult,
  EnviaAddress,
  PackageSpec,
  ShippingOption,
  BranchInfo,
} from './shipment-provider.interface';
import { ShipmentStatus } from '../entities/shipment.entity';

// ─── Mapeo nombre de provincia → código de estado de Envia ──────────────────
// Envia usa el campo `code_2_digits` que devuelve
// GET https://queries.envia.com/state?country_code=AR
// Ej.: Buenos Aires = "BA", CABA = "DF", Córdoba = "CB".
export const PROVINCE_MAP: Record<string, string> = {
  'Buenos Aires': 'BA',
  'CABA': 'DF',
  'Ciudad Autónoma de Buenos Aires': 'DF',
  'Catamarca': 'CT',
  'Chaco': 'CC',
  'Chubut': 'CH',
  'Córdoba': 'CB',
  'Corrientes': 'CN',
  'Entre Ríos': 'ER',
  'Formosa': 'FM',
  'Jujuy': 'JY',
  'La Pampa': 'LP',
  'La Rioja': 'LR',
  'Mendoza': 'MZ',
  'Misiones': 'MN',
  'Neuquén': 'NQ',
  'Río Negro': 'RN',
  'Salta': 'SA',
  'San Juan': 'SJ',
  'San Luis': 'SL',
  'Santa Cruz': 'SC',
  'Santa Fe': 'SF',
  'Santiago del Estero': 'SE',
  'Tierra del Fuego': 'TF',
  'Tucumán': 'TM',
};

/** Provincia a partir del código de Envia ("DF" → "Ciudad Autónoma de Buenos Aires"). */
const PROVINCE_NAME: Record<string, string> = Object.entries(PROVINCE_MAP).reduce(
  (acc, [name, code]) => {
    acc[code] = name;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Los nombres de ciudad que trae el checkout no siempre los reconoce el
 * geocoder (por ejemplo "Ciudad Autónoma de Buenos Aires"). Se normalizan.
 */
const CITY_ALIASES: Record<string, string> = {
  'ciudad autonoma de buenos aires': 'Buenos Aires',
  'ciudad autonoma de bs as': 'Buenos Aires',
};

function normalizeCity(city?: string): string {
  if (!city) return '';
  return CITY_ALIASES[city.trim().toLowerCase()] ?? city;
}

/** Carriers que se cotizan por defecto en Argentina (se puede override con ENVIA_CARRIERS). */
/** TOROX trabaja sólo con Correo Argentino (se puede cambiar con ENVIA_CARRIERS). */
const DEFAULT_CARRIERS = ['correoArgentino'];

// ─── Mapeo estado Envia → ShipmentStatus ────────────────────────────────────
const ENVIA_STATUS_MAP: Record<string, ShipmentStatus> = {
  created: ShipmentStatus.PREPARING,
  'label created': ShipmentStatus.PREPARING,
  ready: ShipmentStatus.PREPARING,
  'ready for pickup': ShipmentStatus.PREPARING,
  'picked up': ShipmentStatus.PICKED_UP,
  collected: ShipmentStatus.PICKED_UP,
  'in pickup': ShipmentStatus.PICKED_UP,
  'at origin': ShipmentStatus.IN_TRANSIT,
  received: ShipmentStatus.IN_TRANSIT,
  'in transit': ShipmentStatus.IN_TRANSIT,
  transit: ShipmentStatus.IN_TRANSIT,
  'out for delivery': ShipmentStatus.OUT_FOR_DELIVERY,
  'in delivery': ShipmentStatus.OUT_FOR_DELIVERY,
  'on the way': ShipmentStatus.OUT_FOR_DELIVERY,
  delivered: ShipmentStatus.DELIVERED,
};

/** Nombres comerciales: Envia a veces devuelve el slug ("andreani", "dpd"). */
const CARRIER_NAMES: Record<string, string> = {
  andreani: 'Andreani',
  correoargentino: 'Correo Argentino',
  oca: 'OCA',
  dpd: 'DPD',
  dhl: 'DHL',
  fedex: 'FedEx',
  urbano: 'Urbano',
  paquery: 'Paquery',
  rapiboy: 'Rapiboy',
  treggo: 'Treggo',
  welivery: 'Welivery',
  flash: 'Flash',
  rueddo: 'Rueddo',
};
function prettyCarrierName(name: string): string {
  return CARRIER_NAMES[(name ?? '').toLowerCase().replace(/\s+/g, '')] ?? name;
}

/** Timeouts de la API de Envia: una cotización colgada no debe trabar el checkout. */
const RATE_TIMEOUT_MS = 15_000;
const GENERATE_TIMEOUT_MS = 30_000;

const STATUS_FLOW: ShipmentStatus[] = [
  ShipmentStatus.PREPARING,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
];

/** Item que devuelve POST /ship/rate/ (solo los campos que usamos). */
interface EnviaRateItem {
  carrier: string;
  carrierDescription?: string;
  carrierId: number | string;
  serviceId?: number | string;
  service: string;
  serviceDescription?: string;
  /** 0 = puerta a puerta, 1 = puerta a sucursal, 2 = sucursal a puerta, 3 = sucursal a sucursal. */
  dropOff?: number;
  dropOffDescription?: string;
  branchType?: string | null;
  deliveryEstimate?: string;
  deliveryDate?: { date?: string; dateDifference?: number; timeUnit?: string; time?: string };
  totalPrice: number | string;
  currency?: string;
  branches?: unknown[];
}

/** Fila que devuelve el Queries API en /branches/{carrier}/{country}. */
interface EnviaBranchRow {
  branch_id?: string;
  branch_code?: string;
  branch_type?: number;
  reference?: string;
  distance?: number;
  phone?: string;
  hours?: unknown;
  address?: {
    street?: string;
    number?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: string | number;
    longitude?: string | number;
    admission?: boolean;
    delivery?: boolean;
    address?: string;
  };
}

function toNumber(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

@Injectable()
export class EnviaProvider implements ShipmentProvider {
  private readonly logger = new Logger(EnviaProvider.name);

  /** Caché de geocodificación (1 hora). */
  private geoCache: {
    key: string;
    value: { latitude: number; longitude: number; source: string } | null;
    expiresAt: number;
  } | null = null;

  /** Caché de la lista de carriers (5 minutos). */
  private carriersCache: {
    value: { id: string; name: string; description?: string }[];
    expiresAt: number;
  } | null = null;

  /** Caché de coordenadas por código postal (1 hora). */
  private postalCodeCache = new Map<
    string,
    { value: { latitude: number; longitude: number } | null; expiresAt: number }
  >();

  /** Caché de geocodificación por dirección (1 hora). */
  private addressGeoCache = new Map<
    string,
    { value: { latitude: number; longitude: number } | null; expiresAt: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    // Aviso explícito de contra qué cuenta de Envia se está operando: en
    // desarrollo con la cuenta de PRODUCCIÓN cada pago aprobado genera una
    // etiqueta real que se descuenta del saldo.
    const env = this.isSandbox ? 'SANDBOX (pruebas)' : 'PRODUCCIÓN';
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    if (!this.isSandbox && nodeEnv !== 'production') {
      this.logger.warn(
        `Envia.com en ${env} con NODE_ENV=${nodeEnv}: las guías que se generen son REALES y se cobran. Para probar usá api-test.envia.com con un token de sandbox.`,
      );
    } else {
      this.logger.log(`Envia.com: operando en ${env} (${this.apiBase}).`);
    }
  }

  // ─── Configuración ──────────────────────────────────────────────────────────

  get apiBase(): string {
    return this.config.get<string>('ENVIA_API_BASE') || 'https://api.envia.com';
  }

  get queriesBase(): string {
    return this.config.get<string>('ENVIA_QUERIES_BASE') || 'https://queries.envia.com';
  }

  get geocodeBase(): string {
    return this.config.get<string>('ENVIA_GEOCODE_BASE') || 'https://geocodes.envia.com';
  }

  /** true si estamos pegando al sandbox (api-test.envia.com). */
  get isSandbox(): boolean {
    return this.apiBase.includes('test');
  }

  /**
   * Envia usa un único Bearer token (la API key del dashboard), sin endpoint de login.
   * Si no está configurado, el envío no puede cotizarse ni generarse.
   */
  private getToken(): string | null {
    const token = this.config.get<string>('ENVIA_API_KEY');
    if (!token) {
      this.logger.error('ENVIA_API_KEY no configurada: no se puede operar con Envia.com.');
      return null;
    }
    return token;
  }

  private headers(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Slugs de los carriers a cotizar. `undefined` significa "todos los carriers
   * disponibles" (se configura con ENVIA_CARRIERS=all o vacío).
   */
  getCarrierSlugs(): string[] | undefined {
    const raw = (this.config.get<string>('ENVIA_CARRIERS') ?? '').trim();
    // Sin configurar → sólo los correos por defecto (Correo Argentino).
    // "all" sigue disponible para cotizar con todos los de Envia.
    if (!raw) return DEFAULT_CARRIERS;
    if (raw.toLowerCase() === 'all') return undefined;
    const list = raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return list.length ? list : DEFAULT_CARRIERS;
  }

  /**
   * Carriers con los que se cotiza. Si no hay una lista configurada se consultan
   * los carriers disponibles en Argentina (Envia exige el carrier en la request).
   */
  private async resolveCarrierSlugs(): Promise<string[]> {
    const configured = this.getCarrierSlugs();
    if (configured) return configured;
    const carriers = await this.getCarriers();
    return carriers.map((c) => c.name);
  }

  /** Dirección de origen tal como está configurada en el .env. */
  envOrigin(): EnviaAddress {
    return {
      name: this.config.get<string>('ENVIA_ORIGIN_NAME', 'TOROX'),
      company: this.config.get<string>('ENVIA_ORIGIN_COMPANY', 'TOROX'),
      email: this.config.get<string>('ENVIA_ORIGIN_EMAIL', ''),
      phone: this.config.get<string>('ENVIA_ORIGIN_PHONE', ''),
      street: this.config.get<string>('ENVIA_ORIGIN_STREET', ''),
      number: this.config.get<string>('ENVIA_ORIGIN_NUMBER', ''),
      city: this.config.get<string>('ENVIA_ORIGIN_CITY', ''),
      state: this.config.get<string>('ENVIA_ORIGIN_STATE', 'DF'),
      country: 'AR',
      postalCode: this.config.get<string>('ENVIA_ORIGIN_POSTAL_CODE', ''),
    };
  }

  // ─── Paquetes ───────────────────────────────────────────────────────────────

  private buildPackage(params: PackageSpec) {
    return {
      type: params.type || 'box',
      content: params.content || 'Producto',
      amount: params.amount ?? 1,
      declaredValue: params.declaredValue ?? 0,
      weight: params.weightKg,
      weightUnit: 'KG',
      lengthUnit: 'CM',
      dimensions: {
        length: params.lengthCm,
        width: params.widthCm,
        height: params.heightCm,
      },
    };
  }

  // ─── Cotización ─────────────────────────────────────────────────────────────

  /**
   * Cotiza todos los carriers/servicios disponibles para un destino.
   * Devuelve una lista de opciones (una por carrier + servicio + modalidad) para
   * que el comprador elija: cada una con su precio real y su tiempo estimado.
   *
   * `dropOff` describe [origen → destino] (documentación oficial de Envia):
   *   0 = puerta a puerta · 1 = sucursal a puerta · 2 = puerta a sucursal · 3 = sucursal a sucursal
   *
   * El origen es POR CARRIER: cada carrier se cotiza con su propia sucursal de
   * origen (la que el admin configuró para esa paquetería) y sólo se ofrecen las
   * modalidades compatibles con ese origen:
   *   - origen en una sucursal → dropOff 2 y 3 (el admin deja el paquete ahí)
   *   - origen en la puerta   → dropOff 1 (el admin lo deja en cualquier
   *     sucursal del carrier; nunca 0 porque no hay retiro programado).
   */
  async quoteOptions(params: {
    /** Origen por carrier: `{ carrier: direccion }`. */
    origins: Record<string, EnviaAddress>;
    /** Origen usado cuando el carrier no tiene una sucursal configurada. */
    fallbackOrigin?: EnviaAddress;
    destination: EnviaAddress;
    packages: PackageSpec[];
    carriers?: string[];
  }): Promise<ShippingOption[]> {
    const token = this.getToken();
    if (!token) {
      throw new ServiceUnavailableException(
        'Envia.com no está configurado (falta ENVIA_API_KEY).',
      );
    }

    const carriers = params.carriers ?? (await this.resolveCarrierSlugs());

    if (!carriers.length) {
      const origin = params.fallbackOrigin;
      if (!origin) {
        throw new ServiceUnavailableException(
          'No hay ningún origen configurado para cotizar envíos.',
        );
      }
      const items = await this.rate(token, undefined, {
        origin,
        destination: params.destination,
        packages: params.packages,
      });
      const options = items
        .filter((item) => this.allowedDropOff(origin).includes(item.dropOff ?? 0))
        .map((item) => this.toOption(item));
      if (!options.length) {
        throw new ServiceUnavailableException(
          'Envia.com no devolvió cotizaciones para la dirección indicada.',
        );
      }
      await this.attachBranches(options, params.destination, params.packages);
      return options.sort((a, b) => a.cost - b.cost);
    }

    const settled = await Promise.allSettled(
      carriers.map(async (carrier) => {
        const origin = params.origins[carrier] ?? params.fallbackOrigin;
        if (!origin) {
          throw new Error(`No hay origen configurado para ${carrier}`);
        }
        const items = await this.rate(token, carrier, {
          origin,
          destination: params.destination,
          packages: params.packages,
        });
        const allowed = this.allowedDropOff(origin);
        return items
          .filter((item) => allowed.includes(item.dropOff ?? 0))
          .map((item) => this.toOption(item));
      }),
    );

    const options: ShippingOption[] = [];
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        options.push(...result.value);
      } else {
        this.logger.warn(
          `No se pudo cotizar con ${carriers[index]}: ${result.reason?.message ?? result.reason}`,
        );
      }
    });

    if (!options.length) {
      throw new ServiceUnavailableException(
        'Envia.com no devolvió cotizaciones para la configuración de origen actual.',
      );
    }

    await this.attachBranches(options, params.destination, params.packages);
    await this.sortBranchesByDistance(options, params.destination);
    return options.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Ordena las sucursales de retiro por distancia al comprador. Envia devuelve
   * la lista sin distancia, así que la calculamos desde el código postal.
   */
  private async sortBranchesByDistance(
    options: ShippingOption[],
    destination: EnviaAddress,
  ): Promise<void> {
    const coords = await this.geocodeAddress(destination);
    if (!coords) return;
    for (const option of options) {
      for (const branch of option.branches) {
        const lat = branch.address?.latitude;
        const lng = branch.address?.longitude;
        if (branch.distanceKm == null && lat != null && lng != null) {
          branch.distanceKm = Math.round(
            this.distanceKm(coords.latitude, coords.longitude, lat, lng) * 10,
          ) / 10;
        }
      }
      option.branches.sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
          (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
      // Fuera de las sucursal de la otra punta del país: si hay al menos 3
      // cercanas se muestran sólo esas.
      const near = option.branches.filter(
        (b) => b.distanceKm == null || b.distanceKm <= 60,
      );
      if (near.length >= 3) option.branches = near;
    }
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

  /** Coordenadas aproximadas de un código postal (cacheadas 1 hora). */
  async geocodePostalCode(
    postalCode: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!postalCode) return null;
    const cached = this.postalCodeCache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const value = await this.geocodeEnvia(postalCode);
    this.postalCodeCache.set(postalCode, {
      value,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    return value;
  }
  /**
   * Modalidades que se ofrecen al comprador.
   *
   * Envia define `dropOff` así (Quote Shipment → data.dropOff):
   *   0 puerta→puerta · 1 sucursal→puerta · 2 puerta→sucursal · 3 sucursal→sucursal
   *
   * ⚠️ Antes el código asumía que 2 era "sucursal→puerta". Era al revés: se le
   * ofrecía al comprador un envío A SUCURSAL creyendo que era a domicilio.
   *
   * ENVIA_DELIVERY_MODES elige qué ve el comprador:
   *   - HOME   (por defecto): recibe en su casa → 0, y 1 si hay sucursal de origen.
   *   - BRANCH: retira en una sucursal del correo → 2, y 3 si hay sucursal de origen.
   *   - "HOME,BRANCH": ambas.
   *
   * Con origen "puerta" (dropOff 0/2) el admin igual puede dejar el paquete en
   * una sucursal del correo: Andreani y Correo Argentino lo aceptan.
   */
  private allowedDropOff(origin: EnviaAddress): number[] {
    const modes = (this.config.get<string>('ENVIA_DELIVERY_MODES') || 'HOME')
      .toUpperCase()
      .split(',')
      .map((m) => m.trim());
    const allowed: number[] = [];
    if (modes.includes('HOME')) allowed.push(0, ...(origin.branchCode ? [1] : []));
    if (modes.includes('BRANCH')) allowed.push(2, ...(origin.branchCode ? [3] : []));
    return allowed;
  }

  private async rate(
    token: string,
    carrier: string | undefined,
    params: { origin: EnviaAddress; destination: EnviaAddress; packages: PackageSpec[] },
  ): Promise<EnviaRateItem[]> {
    const response = await firstValueFrom(
      this.http.post<{ meta?: string; data?: EnviaRateItem[]; error?: unknown }>(
        `${this.apiBase}/ship/rate/`,
        {
          origin: params.origin,
          destination: params.destination,
          packages: params.packages.map((p) => this.buildPackage(p)),
          shipment: { type: 1, ...(carrier ? { carrier } : {}) },
          settings: { currency: 'ARS' },
        },
        { headers: this.headers(token) },
      ).pipe(timeout(RATE_TIMEOUT_MS)),
    );
    return response.data?.data ?? [];
  }

  private toOption(item: EnviaRateItem): ShippingOption {
    const dropOff = item.dropOff ?? 0;
    const branches = (item.branches as EnviaBranchRow[] | undefined) ?? [];
    return {
      id: `${item.carrier}|${item.service}|${dropOff}`,
      carrier: item.carrier,
      carrierId: String(item.carrierId ?? ''),
      carrierName: prettyCarrierName(item.carrierDescription ?? item.carrier),
      service: item.service,
      serviceDescription: item.serviceDescription,
      dropOff,
      dropOffDescription: item.dropOffDescription,
      // Envia: 0 puerta→puerta · 1 sucursal→puerta · 2 puerta→sucursal · 3 sucursal→sucursal
      deliveryMode: dropOff === 2 || dropOff === 3 ? 'BRANCH' : 'HOME',
      pickupMode: dropOff === 1 || dropOff === 3 ? 'BRANCH' : 'DOOR',
      cost: Number(item.totalPrice ?? 0),
      currency: item.currency || 'ARS',
      deliveryEstimate: item.deliveryEstimate,
      deliveryDate: item.deliveryDate?.date,
      branches: branches
        .filter((branch) => !!branch?.branch_code)
        .map((branch) => this.toBranch(branch, item.carrier))
        .sort(
          (a, b) =>
            (a.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
        ),
    };
  }

  /**
   * Para las opciones con entrega en sucursal buscamos las sucursales donde el
   * comprador puede retirar el paquete cerca de su dirección. Envia ya devuelve
   * esa lista en la cotización; si viene vacía, la consultamos en el Queries API.
   */
  private async attachBranches(
    options: ShippingOption[],
    destination: EnviaAddress,
    packages: PackageSpec[],
  ): Promise<void> {
    const carriers = new Set(
      options
        .filter((o) => o.deliveryMode === 'BRANCH' && o.branches.length === 0)
        .map((o) => o.carrier),
    );
    await Promise.all(
      [...carriers].map(async (carrier) => {
        try {
          const branches = await this.getBranches({
            carrier,
            type: 2,
            zipcode: destination.postalCode,
            city: destination.city,
            state: destination.state,
            limit: 15,
            packages,
          });
          options
            .filter(
              (o) =>
                o.carrier === carrier &&
                o.deliveryMode === 'BRANCH' &&
                o.branches.length === 0,
            )
            .forEach((o) => {
              o.branches = branches;
            });
        } catch (error: any) {
          this.logger.warn(
            `No se pudieron listar sucursales de ${carrier}: ${error?.message}`,
          );
        }
      }),
    );
  }

  // ─── Sucursales ─────────────────────────────────────────────────────────────

  /**
   * Lista sucursales de un carrier. `type`: 1 = admisión (origen), 2 = entrega
   * (destino), 3 = ambas. Usa el Queries API de Envia.
   */
  async getBranches(params: {
    carrier: string;
    type?: 1 | 2 | 3;
    zipcode?: string;
    city?: string;
    state?: string;
    limit?: number;
    packages?: PackageSpec[];
    timeoutMs?: number;
  }): Promise<BranchInfo[]> {
    const token = this.getToken();
    if (!token) return [];

    const body: Record<string, unknown> = {
      type: params.type ?? 3,
      limitBranches: params.limit ?? 20,
    };
    if (params.zipcode) body.zipcode = params.zipcode;
    if (params.city) body.locality = params.city;
    if (params.state) body.state = params.state;
    if (params.packages?.length) {
      body.packages = params.packages.map((p) => ({
        weight: p.weightKg,
        length: p.lengthCm,
        height: p.heightCm,
        width: p.widthCm,
        amount: p.amount ?? 1,
      }));
    }

    const response = await firstValueFrom(
      this.http
        .post<any>(
          `${this.queriesBase}/branches/${params.carrier}/AR`,
          body,
          { headers: this.headers(token) },
        )
        // Hay carriers (dhl, fedex) que tardan ~8s y no devuelven nada: no
        // deben bloquear el mapa ni la cotización.
        .pipe(timeout(params.timeoutMs ?? 5000)),
    );

    // El endpoint devuelve un array plano (no envuelto en { data }).
    const rows: EnviaBranchRow[] = Array.isArray(response.data)
      ? response.data
      : (response.data?.data ?? []);

    return rows
      .filter((row) => !!row?.branch_code)
      .map((row) => this.toBranch(row, params.carrier));
  }

  private toBranch(row: EnviaBranchRow, carrier: string): BranchInfo {
    const admission = row.address?.admission;
    const delivery = row.address?.delivery;
    return {
      branchCode: row.branch_code!,
      branchId: row.branch_id,
      carrier,
      reference: row.reference,
      type: admission && delivery ? 'BOTH' : admission ? 'ORIGIN' : 'DESTINATION',
      address: {
        street: row.address?.street,
        number: row.address?.number,
        city: row.address?.city,
        state: row.address?.state,
        postalCode: row.address?.postalCode,
        country: row.address?.country,
        latitude: toNumber(row.address?.latitude),
        longitude: toNumber(row.address?.longitude),
      },
      distanceKm: toNumber(row.distance),
      phone: row.phone,
      hours: row.hours,
    };
  }

  /** Carriers disponibles en Argentina (para los filtros del admin). */
  async getCarriers(): Promise<{ id: string; name: string; description?: string }[]> {
    const token = this.getToken();
    if (!token) return [];
    if (this.carriersCache && this.carriersCache.expiresAt > Date.now()) {
      return this.carriersCache.value;
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ data?: { id: number | string; name: string; description?: string }[] }>(
          `${this.queriesBase}/carrier?country_code=AR`,
          { headers: this.headers(token) },
        ),
      );
      const carriers = (response.data?.data ?? []).map((c) => ({
        id: String(c.id),
        name: c.name,
        description: c.description,
      }));
      this.carriersCache = { value: carriers, expiresAt: Date.now() + 5 * 60 * 1000 };
      return carriers;
    } catch (error: any) {
      this.logger.warn(`No se pudo obtener la lista de carriers: ${error?.message}`);
      return [];
    }
  }

  /** Carriers habilitados para TOROX (los de ENVIA_CARRIERS), para el admin. */
  async getEnabledCarriers(): Promise<{ id: string; name: string; description?: string }[]> {
    const enabled = this.getCarrierSlugs();
    const all = await this.getCarriers();
    if (!enabled) return all;
    const found = all.filter((c) => enabled.includes(c.name));
    // Si la API no respondió, igual mostramos los habilitados.
    return found.length
      ? found
      : enabled.map((name) => ({ id: name, name, description: prettyCarrierName(name) }));
  }

  // ─── Geocodificación (para el mapa del admin) ───────────────────────────────

  /**
   * Convierte una dirección en coordenadas. Primero usa Nominatim (OpenStreetMap,
   * gratis) y si falla el Geocodes API de Envia (por código postal).
   */
  async geocode(address: EnviaAddress): Promise<{ latitude: number; longitude: number; source: string } | null> {
    const configuredLat = toNumber(this.config.get<string>('ENVIA_ORIGIN_LAT'));
    const configuredLng = toNumber(this.config.get<string>('ENVIA_ORIGIN_LNG'));
    if (configuredLat !== undefined && configuredLng !== undefined) {
      return { latitude: configuredLat, longitude: configuredLng, source: 'env' };
    }

    const query = [address.street, address.number, address.city, address.state, address.country]
      .filter(Boolean)
      .join(', ');

    // La geocodificación no cambia: se cachea 1 hora para no pegarle a Nominatim.
    if (this.geoCache && this.geoCache.expiresAt > Date.now() && this.geoCache.key === query) {
      return this.geoCache.value;
    }

    let result: { latitude: number; longitude: number; source: string } | null = null;
    const nominatim = await this.geocodeNominatim(query);
    if (nominatim) {
      result = { ...nominatim, source: 'nominatim' };
    } else {
      const envia = await this.geocodeEnvia(address.postalCode);
      if (envia) result = { ...envia, source: 'envia' };
    }

    this.geoCache = { key: query, value: result, expiresAt: Date.now() + 60 * 60 * 1000 };
    return result;
  }

  private async geocodeNominatim(
    query: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!query.trim()) return null;
    try {
      const response = await firstValueFrom(
        this.http.get<any[]>('https://nominatim.openstreetmap.org/search', {
          params: { q: query, format: 'jsonv2', limit: 1, countrycodes: 'ar' },
          headers: {
            'User-Agent': `TOROX-ecommerce/1.0 (${
              this.config.get<string>('ENVIA_ORIGIN_EMAIL') || 'admin@torox.com'
            })`,
          },
        }),
      );
      const hit = Array.isArray(response.data) ? response.data[0] : null;
      if (!hit?.lat || !hit?.lon) return null;
      return { latitude: parseFloat(hit.lat), longitude: parseFloat(hit.lon) };
    } catch (error: any) {
      this.logger.warn(`Nominatim no pudo geocodificar "${query}": ${error?.message}`);
      return null;
    }
  }

  private async geocodeEnvia(
    postalCode: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (!postalCode) return null;
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.geocodeBase}/zipcode/AR/${encodeURIComponent(postalCode)}`),
      );
      // El endpoint devuelve un array (o { data: [...] }).
      const row = Array.isArray(response.data) ? response.data[0] : response.data?.data;
      const coords = row?.coordinates;
      const latitude = toNumber(coords?.latitude);
      const longitude = toNumber(coords?.longitude);
      if (latitude === undefined || longitude === undefined) return null;
      return { latitude, longitude };
    } catch (error: any) {
      this.logger.warn(`Envia Geocodes no pudo resolver el CP ${postalCode}: ${error?.message}`);
      return null;
    }
  }

  /**
   * Geocodifica cualquier dirección (por ejemplo la del comprador, para medir
   * qué tan lejos está cada sucursal de retiro). Cache 1 hora.
   */
  async geocodeAddress(
    address: EnviaAddress,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const city = normalizeCity(address.city);
    const street = [address.street, address.number].filter(Boolean).join(' ');
    const queries = [
      [street, city, address.postalCode, 'Argentina'].filter(Boolean).join(', '),
      [address.postalCode, 'Argentina'].filter(Boolean).join(', '),
    ].filter((q) => q.trim().length > 3);

    for (const query of queries) {
      const cached = this.addressGeoCache.get(query);
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.value) return cached.value;
        continue;
      }
      const value = await this.geocodeNominatim(query);
      this.addressGeoCache.set(query, {
        value,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
      if (value) return value;
    }

    // Último recurso: el geocoder de Envia por código postal.
    return this.geocodeEnvia(address.postalCode);
  }

  // ─── Crear envío (generar etiqueta) ─────────────────────────────────────────

  /**
   * Genera la etiqueta usando EXACTAMENTE el carrier y el servicio que el
   * comprador eligió y pagó. Si se pasan las sucursales (origen y/o destino)
   * se incluyen como `branchCode` en la dirección correspondiente.
   */
  async createShipment(input: CreateShipmentInput): Promise<ShipmentCreationResult> {
    const token = this.getToken();
    if (!token) {
      throw new ServiceUnavailableException(
        'Envia.com no está configurado (falta ENVIA_API_KEY).',
      );
    }

    const packageSpec: PackageSpec = {
      weightKg: input.package.weightKg,
      widthCm: input.package.widthCm,
      heightCm: input.package.heightCm,
      lengthCm: input.package.lengthCm,
      declaredValue: input.declaredValue ?? input.package.declaredValue ?? 0,
      content: input.package.content,
    };

    // La sucursal sólo se manda en la dirección que corresponde a la modalidad:
    //   0 puerta→puerta · 1 sucursal→puerta · 2 puerta→sucursal · 3 sucursal→sucursal
    const dropOff = input.dropOff ?? 0;
    const origin: EnviaAddress = { ...input.origin };
    const destination: EnviaAddress = { ...input.destination };
    if (dropOff === 0 || dropOff === 2) delete origin.branchCode;
    if (dropOff === 0 || dropOff === 1) delete destination.branchCode;
    if ((dropOff === 1 || dropOff === 3) && !origin.branchCode) {
      throw new Error(
        'Para enviar desde una sucursal hay que definir la sucursal de origen.',
      );
    }
    if ((dropOff === 2 || dropOff === 3) && !destination.branchCode) {
      throw new Error(
        'Para retirar en sucursal hay que elegir la sucursal de destino.',
      );
    }

    const response = await firstValueFrom(
      this.http.post<{
        meta?: string;
        data?: {
          carrier?: string;
          service?: string;
          shipmentId?: number | string;
          trackingNumber?: string;
          trackUrl?: string;
          label?: string;
          totalPrice?: number | string;
          currency?: string;
        }[];
        error?: unknown;
      }>(
        `${this.apiBase}/ship/generate/`,
        {
          origin,
          destination,
          packages: [this.buildPackage(packageSpec)],
          shipment: {
            type: 1,
            carrier: input.carrier,
            ...(input.service ? { service: input.service } : {}),
          },
          // printFormat y printSize son OBLIGATORIOS al generar la guía (sin
          // ellos Envia responde "Required property missing: printFormat").
          // STOCK_4X6 = etiqueta térmica 10x15 cm; para imprimir en hoja A4
          // común usar ENVIA_PRINT_SIZE=PAPER_4X6.
          settings: {
            currency: 'ARS',
            printFormat: 'PDF',
            printSize: this.config.get<string>('ENVIA_PRINT_SIZE') || 'STOCK_4X6',
          },
        },
        { headers: this.headers(token) },
      ).pipe(timeout(GENERATE_TIMEOUT_MS)),
    ).catch((error) => {
      throw new Error(this.describeError(error));
    });

    const data = response.data?.data?.[0];
    const apiError: any = response.data?.error;
    if (!data?.trackingNumber && apiError?.message === 'SERVICE_QUOTE_ONLY') {
      throw new Error(
        `${input.carrier} (${input.service ?? 'servicio'}) sólo permite cotizar en esta cuenta de Envia, no generar guías. ` +
          'Elegí otro correo o sacalo de ENVIA_CARRIERS.',
      );
    }
    if (!data?.trackingNumber) {
      throw new Error(
        `Envia no devolvió tracking: ${JSON.stringify(response.data?.error ?? response.data)}`,
      );
    }

    return {
      trackingNumber: data.trackingNumber,
      status: ShipmentStatus.PREPARING,
      estimatedDelivery: this.daysFromNow(5),
      carrierName: data.carrier,
      enviaId: String(data.shipmentId ?? ''),
      labelUrl: data.label,
      trackingUrl: data.trackUrl,
      events: [
        {
          status: ShipmentStatus.PREPARING,
          date: new Date(),
          description: 'Envío generado en Envia.com.',
        },
      ],
    };
  }

  // ─── Cancelar envío (anular etiqueta) ───────────────────────────────────────

  /**
   * Anula la etiqueta en Envia y pide el reintegro del costo al carrier.
   * Sólo funciona si el paquete todavía no entró a la red del carrier.
   * POST /ship/cancel/ { carrier, trackingNumber }
   */
  async cancelShipment(params: {
    carrier: string;
    trackingNumber: string;
  }): Promise<{ cancelled: boolean; balanceReturned?: boolean; raw?: unknown }> {
    const token = this.getToken();
    if (!token) {
      throw new ServiceUnavailableException(
        'Envia.com no está configurado (falta ENVIA_API_KEY).',
      );
    }
    const response = await firstValueFrom(
      this.http
        .post<any>(
          `${this.apiBase}/ship/cancel/`,
          { carrier: params.carrier, trackingNumber: params.trackingNumber },
          { headers: this.headers(token) },
        )
        .pipe(timeout(RATE_TIMEOUT_MS)),
    ).catch((error) => {
      throw new Error(this.describeError(error));
    });
    const body = response.data ?? {};
    const data = Array.isArray(body.data) ? body.data[0] : body.data;
    const failed = body.meta === 'error' || !!body.error;
    if (failed) {
      throw new Error(
        `Envia no pudo cancelar el envío: ${JSON.stringify(body.error ?? body)}`,
      );
    }
    return {
      cancelled: true,
      balanceReturned: data?.balanceReturned ?? data?.balanceRefunded,
      raw: body,
    };
  }

  // ─── Estado del envío ───────────────────────────────────────────────────────

  async getShipmentStatus(
    trackingNumber: string,
  ): Promise<{ status: ShipmentStatus | null; rawStatus: string; description?: string } | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await firstValueFrom(
        this.http.post<{
          data?: {
            trackingNumber: string;
            status: string;
            carrier?: string;
            events?: { timestamp?: string; description?: string; location?: string }[];
          }[];
        }>(
          `${this.apiBase}/ship/generaltrack/`,
          { trackingNumbers: [trackingNumber] },
          { headers: this.headers(token) },
        ).pipe(timeout(RATE_TIMEOUT_MS)),
      );

      const data = response.data?.data?.[0];
      if (!data) return null;

      const lastEvent = data.events?.[data.events.length - 1];
      return {
        status: this.mapStatus(data.status),
        rawStatus: data.status,
        description: lastEvent?.description,
      };
    } catch (error: any) {
      this.logger.error(`No se pudo obtener el estado de ${trackingNumber}: ${error?.message}`);
      return null;
    }
  }

  // ─── ShipmentProvider interface ──────────────────────────────────────────────

  getNextStatus(current: ShipmentStatus): ShipmentStatus | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Traduce el estado de Envia a nuestro flujo. Devuelve `null` cuando el
   * estado no es parte del flujo normal (excepción, intento fallido,
   * devolución, cancelado, etc.): en ese caso el envío NO cambia de estado,
   * sólo se registra el evento para que el admin lo vea.
   *
   * Antes cualquier estado desconocido volvía el envío a PREPARING y
   * "out for delivery - ..." podía caer como DELIVERED.
   */
  mapStatus(enviaStatus?: string): ShipmentStatus | null {
    if (!enviaStatus) return null;
    const normalized = enviaStatus.toLowerCase().trim();
    if (ENVIA_STATUS_MAP[normalized]) return ENVIA_STATUS_MAP[normalized];
    // Estados anómalos: no se avanza ni se retrocede.
    if (
      /(exception|incidenc|undeliver|not delivered|attempt|intento|return|devol|cancel|lost|damag|hold|retenid)/.test(
        normalized,
      )
    ) {
      return null;
    }
    // Estados compuestos: el orden importa ("out for delivery" contiene "deliver").
    if (normalized.includes('out for') || normalized.includes('en reparto') || normalized.includes('en distribuci'))
      return ShipmentStatus.OUT_FOR_DELIVERY;
    if (normalized.includes('delivered') || normalized.includes('entregado')) return ShipmentStatus.DELIVERED;
    if (normalized.includes('pick') || normalized.includes('retirado') || normalized.includes('colectado'))
      return ShipmentStatus.PICKED_UP;
    if (normalized.includes('transit') || normalized.includes('origin') || normalized.includes('tránsito') || normalized.includes('transito'))
      return ShipmentStatus.IN_TRANSIT;
    if (normalized.includes('created') || normalized.includes('ready') || normalized.includes('generad'))
      return ShipmentStatus.PREPARING;
    return null;
  }

  /** Mensaje legible a partir de un error de axios / de la API de Envia. */
  describeError(error: any): string {
    const data = error?.response?.data;
    const apiMessage =
      data?.error?.message ??
      data?.error?.description ??
      (typeof data?.error === 'string' ? data.error : undefined) ??
      data?.message;
    if (apiMessage) {
      return `Envia respondió ${error?.response?.status ?? ''}: ${
        typeof apiMessage === 'string' ? apiMessage : JSON.stringify(apiMessage)
      }`.trim();
    }
    if (error?.name === 'TimeoutError') return 'Envia no respondió a tiempo (timeout).';
    return error?.message ?? String(error);
  }

  private daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
