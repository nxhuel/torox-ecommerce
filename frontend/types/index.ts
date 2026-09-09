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
  price: number
  originalPrice?: number | null
  cost?: number | null
  stock: number
  images: string[]
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
  quantity: number
  unitPrice: number
  productSnapshot?: {
    name: string
    image?: string
    brand?: string
    slug?: string
    stock?: number
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
  freeShippingThreshold: number
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
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
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
  shippingMethod: 'HOME_DELIVERY' | 'PICKUP'
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  status: OrderStatus
  notes?: string | null
  items: OrderItem[]
  payment?: Payment | null
  shipment?: Shipment | null
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