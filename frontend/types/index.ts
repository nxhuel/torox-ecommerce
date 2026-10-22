export type UserRole = 'ADMIN' | 'CUSTOMER'

export interface SpecRow {
  label: string
  value: string
}

export interface SpecGroup {
  title: string
  rows: SpecRow[]
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  role: UserRole
  status: string
  avatarUrl?: string | null
  createdAt: string
  updatedAt: string
  fullName?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  isActive: boolean
  parentId?: string | null
  parent?: Category | null
  children?: Category[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Total products in this category incl. its subcategories. */
  productCount?: number
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku?: string | null
  stock: number
  images: string[]
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string | null
  shortDescription?: string | null
  categoryId: string
  category?: Category
  brand?: string | null
  sku: string
  /** List price. Shown crossed out when `discountPercentage` applies. */
  price: number
  cost?: number | null
  stock: number
  images: string[]
  /** Label of the variation axis, e.g. "Color". */
  variantName?: string | null
  variants?: ProductVariant[]
  /** Active promotion applied to this product, if any. */
  promotion?: ProductPromotion | null
  specifications?: Record<string, string> | null
  highlights?: string[] | null
  specGroups?: SpecGroup[] | null
  isFeatured: boolean
  isOnSale: boolean
  discountPercentage?: number | null
  isActive: boolean
  salesCount: number
  createdAt: string
  updatedAt: string
  finalPrice: number
  isInStock: boolean
  favoriteId?: string
  // Logística (Envia.com)
  weightKg?: number
  widthCm?: number
  heightCm?: number
  lengthCm?: number
}

export interface Paginated<T> {
  items: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  productSnapshot?: {
    name: string
    image?: string
    brand?: string
    slug?: string
    stock?: number
    variantId?: string | null
    variantName?: string | null
  } | null
  createdAt: string
}

export interface Cart {
  id: string
  userId?: string | null
  sessionId?: string | null
  items: CartItem[]
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  createdAt: string
  updatedAt: string
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_APPROVED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type ShipmentStatus =
  | 'PREPARING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'

export interface OrderItem {
  id: string
  productId: string
  variantId?: string | null
  variantName?: string | null
  name: string
  sku: string
  image?: string | null
  unitPrice: number
  quantity: number
  subtotal: number
}

export interface Payment {
  id: string
  orderId: string
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER'
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  amount: number
  provider: string
  cardBrand?: string | null
  lastFour?: string | null
  reference?: string | null
  message?: string | null
  approvedAt?: string | null
  createdAt: string
}

export interface ShipmentEvent {
  status: ShipmentStatus
  date: string
  description: string
}

export interface Shipment {
  id: string
  orderId: string
  trackingNumber: string
  carrier: string
  status: ShipmentStatus
  estimatedDelivery: string
  events: ShipmentEvent[]
  enviaId?: string | null
  labelUrl?: string | null
  trackUrl?: string | null
  service?: string | null
  dropOff?: number | null
  branchCode?: string | null
  branchAddress?: string | null
  originAddress?: string | null
  originBranchCode?: string | null
  declaredValue?: number | null
  packageInfo?: Record<string, number> | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
}

/* ---------- Envíos (Envia.com) ---------- */

/** Sucursal (centro de admisión / punto de retiro) de un carrier. */
export interface BranchInfo {
  branchCode: string
  branchId?: string
  carrier: string
  carrierName?: string
  reference?: string
  type: 'ORIGIN' | 'DESTINATION' | 'BOTH'
  address: {
    street?: string
    number?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    latitude?: number
    longitude?: number
  }
  distanceKm?: number
  phone?: string
  hours?: unknown
}

/** Una opción de envío cotizada en Envia.com (carrier + servicio + modalidad). */
export interface ShippingOption {
  id: string
  carrier: string
  carrierId?: string
  carrierName: string
  service: string
  serviceDescription?: string
  /** 0 = puerta a puerta, 1 = puerta a sucursal, 2 = sucursal a puerta, 3 = sucursal a sucursal. */
  dropOff: number
  dropOffDescription?: string
  deliveryMode: 'HOME' | 'BRANCH'
  pickupMode: 'DOOR' | 'BRANCH'
  cost: number
  currency: string
  deliveryEstimate?: string
  deliveryDate?: string
  branches: BranchInfo[]
}

/** Opción elegida por el comprador (snapshot guardado en la orden). */
export interface ShippingOptionSnapshot extends Omit<ShippingOption, 'branches'> {}

/** Datos del mapa de sucursales (admin). */
export interface BranchesMapData {
  origin: {
    name: string
    company?: string
    email?: string
    phone?: string
    street: string
    number?: string
    city: string
    state: string
    country: string
    postalCode: string
    latitude?: number | null
    longitude?: number | null
    geocodeSource?: string | null
  }
  /** Sucursal de origen configurada para cada paquetería. */
  originBranches: BranchInfo[]
  branches: BranchInfo[]
  /** Total de sucursales que devolvió Envia (antes de filtrar por cercanía). */
  totalBranches?: number
  /** Radio de búsqueda en km. */
  radiusKm?: number
  carriers: { id: string; name: string; description?: string }[]
  configuredCarriers: string[]
  environment: {
    apiBase: string
    queriesBase: string
    isSandbox: boolean
  }
}

export interface Order {
  id: string
  orderNumber: string
  userId?: string | null
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  shippingAddress: {
    province: string
    city: string
    postalCode: string
    address: string
    number: string
    apartment?: string
    references?: string
  }
  shippingMethod: 'HOME_DELIVERY' | 'BRANCH_PICKUP' | 'PICKUP'
  shippingOption?: ShippingOptionSnapshot | null
  shippingBranch?: BranchInfo | null
  /** Origen congelado del envío (sucursal o dirección de salida del paquete). */
  shippingOrigin?: {
    carrier: string
    branchCode: string | null
    reference?: string | null
    address?: {
      name?: string
      street?: string
      number?: string
      city?: string
      state?: string
      postalCode?: string
    }
  } | null
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  status: OrderStatus
  notes?: string | null
  items: OrderItem[]
  payment?: Payment | null
  shipment?: Shipment | null
  packageDetails?: {
    weightKg: number
    widthCm: number
    heightCm: number
    lengthCm: number
    declaredValue: number
  } | null
  createdAt: string
  updatedAt: string
}

export type NotificationType =
  | 'PROMOTION'
  | 'OFFER'
  | 'ORDER_STATUS'
  | 'SHIPMENT_STATUS'
  | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  link?: string | null
  createdAt: string
}

export type PromotionType =
  | 'PERCENTAGE_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'FREE_SHIPPING'
  | 'SPECIAL_OFFER'

export interface Promotion {
  id: string
  name: string
  description?: string | null
  type: PromotionType
  value: number
  startDate: string
  endDate: string
  productIds: string[]
  categoryIds: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  isCurrentlyActive?: boolean
}

/** Promotion summary embedded in a product response. */
export interface ProductPromotion {
  id: string
  name: string
  type: PromotionType
  value: number
  startDate: string
  endDate: string
}

export interface FinanceMovement {
  id: string
  type: 'INCOME' | 'EXPENSE'
  category: 'SALE' | 'MERCHANDISE' | 'LOGISTICS' | 'ADVERTISING' | 'SALARY' | 'OTHER'
  description: string
  amount: number
  date: string
  referenceId?: string | null
  createdAt: string
}

export interface DashboardMetrics {
  totalSales: number
  monthSales: number
  totalOrders: number
  pendingOrders: number
  customersCount: number
  productsCount: number
  lowStockProducts: Product[]
  lowStockCount: number
  pendingPayments: number
  avgTicket: number
  profit: number
}