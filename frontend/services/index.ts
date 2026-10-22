import { useApi } from '~/composables/useApi'
import { useRuntimeConfig } from '#app'
import type {
  BranchInfo,
  BranchesMapData,
  Category,
  DashboardMetrics,
  FinanceMovement,
  Notification,
  Order,
  Paginated,
  Payment,
  Product,
  Promotion,
  Shipment,
  ShippingOption,
  User,
} from '~/types'

let client: ReturnType<typeof useApi> | null = null

function api() {
  if (!client) client = useApi()
  return client
}

/* ---------- Auth ---------- */
export const authService = {
  login: (email: string, password: string) =>
    api().api<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    api().api<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: data,
    }),
  forgotPassword: (email: string) =>
    api().api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  verifyResetCode: (email: string, code: string) =>
    api().api<{ resetToken: string }>('/auth/verify-reset-code', {
      method: 'POST',
      body: { email, code },
    }),
  resetPassword: (token: string, password: string) =>
    api().api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
  me: () => api().api<User>('/auth/me'),
}

/* ---------- Categories ---------- */
export const categoriesService = {
  all: (active = false) =>
    api().api<Category[]>(`/categories${active ? '?active=true' : ''}`),
  create: (data: Partial<Category>) =>
    api().api<Category>('/categories', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Category>) =>
    api().api<Category>(`/categories/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api().api(`/categories/${id}`, { method: 'DELETE' }),
}

/* ---------- Products ---------- */
export interface ProductQuery {
  search?: string
  categoryId?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  isOnSale?: boolean
  isFeatured?: boolean
  inStock?: boolean
  sortBy?: string
  page?: number
  limit?: number
}

export const productsService = {
  all: (query: ProductQuery = {}) =>
    api().list<Product>(`/products?${new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString()}`),
  featured: () => api().api<Product[]>('/products/featured'),
  onSale: () => api().api<Product[]>('/products/on-sale'),
  brands: () => api().api<string[]>('/products/brands'),
  bySlug: (slug: string) => api().api<Product>(`/products/slug/${slug}`),
  byId: (id: string) => api().api<Product>(`/products/${id}`),
  related: (id: string, categoryId: string) =>
    api().api<Product[]>(`/products/${id}/related?categoryId=${categoryId}`),
  create: (data: Record<string, unknown>) =>
    api().api<Product>('/products', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) =>
    api().api<Product>(`/products/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api().api(`/products/${id}`, { method: 'DELETE' }),
  lowStock: (threshold = 5) => api().api<Product[]>(`/products/low-stock?threshold=${threshold}`),
}

/* ---------- Uploads ---------- */
export const uploadsService = {
  /** Uploads one or many image files and returns their public URLs. */
  images: async (files: File[]): Promise<string[]> => {
    if (!files.length) return []
    const config = useRuntimeConfig()
    const base = config.public.apiBase as string
    const root = base.replace(/\/api\/?$/, '')
    const fd = new FormData()
    files.forEach((file) => fd.append('images', file))
    const res = await api().api<{ urls: string[] }>('/uploads', {
      method: 'POST',
      body: fd as any,
    })
    return res.urls.map((u) => (u.startsWith('http') ? u : `${root}${u}`))
  },
}

/* ---------- Cart ---------- */
export const cartService = {
  get: (sessionId?: string) =>
    api().api(`/cart${sessionId ? `?sessionId=${sessionId}` : ''}`),
  addItem: (cartId: string, productId: string, quantity: number, variantId?: string | null) =>
    api().api('/cart/items', { method: 'POST', body: { cartId, productId, quantity, variantId } }),
  updateItem: (itemId: string, cartId: string, quantity: number) =>
    api().api(`/cart/items/${itemId}`, { method: 'PATCH', body: { cartId, quantity } }),
  removeItem: (itemId: string, cartId: string) =>
    api().api(`/cart/items/${itemId}?cartId=${cartId}`, { method: 'DELETE' }),
  clear: (cartId: string) => api().api(`/cart/${cartId}/clear`, { method: 'DELETE' }),
}

/* ---------- Orders ---------- */
export const ordersService = {
  create: (data: Record<string, unknown>) =>
    api().api<Order>('/orders', { method: 'POST', body: data }),
  mine: () => api().api<Order[]>('/orders/mine'),
  get: (id: string) => api().api<Order>(`/orders/${id}`),
  all: (query: { status?: string; search?: string; userId?: string; page?: number; limit?: number } = {}) =>
    api().list<Order>(
      `/orders?${new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),
  updateStatus: (id: string, status: string, notes?: string) =>
    api().api<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status, notes } }),
  approvePayment: (id: string) =>
    api().api<Order>(`/orders/${id}/approve-payment`, { method: 'POST' }),
  rejectPayment: (id: string, reason?: string) =>
    api().api<Order>(`/orders/${id}/reject-payment`, { method: 'POST', body: { reason } }),
  cancel: (id: string, reason?: string) =>
    api().api<Order>(`/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
  startMercadoPago: (orderId: string, data: { customerEmail: string; customerName?: string; customerPhone?: string }) =>
    api().api(`/orders/${orderId}/start-mercado-pago`, { method: 'POST', body: data }),
  getMercadoPagoUrl: (orderId: string) =>
    api().api(`/orders/${orderId}/mercado-pago-url`),
}

/* ---------- Favorites ---------- */
export const favoritesService = {
  all: () => api().api<Product[]>('/favorites'),
  ids: () => api().api<string[]>('/favorites/ids'),
  toggle: (productId: string) =>
    api().api<{ added: boolean; message: string }>('/favorites/toggle', {
      method: 'POST',
      body: { productId },
    }),
}

/* ---------- Notifications ---------- */
export const notificationsService = {
  all: () => api().api<Notification[]>('/notifications'),
  unreadCount: () => api().api<number>('/notifications/unread-count'),
  markRead: (id: string) => api().api(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api().api('/notifications/read-all', { method: 'PATCH' }),
  broadcast: (data: { type: string; title: string; message: string; link?: string }) =>
    api().api('/notifications/broadcast', { method: 'POST', body: data }),
}

/* ---------- Promotions ---------- */
export const promotionsService = {
  all: () => api().api<Promotion[]>('/promotions'),
  active: () => api().api<Promotion[]>('/promotions/active'),
  create: (data: Record<string, unknown>) =>
    api().api<Promotion>('/promotions', { method: 'POST', body: data }),
  update: (id: string, data: Record<string, unknown>) =>
    api().api<Promotion>(`/promotions/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api().api(`/promotions/${id}`, { method: 'DELETE' }),
}

/* ---------- Shipments ---------- */
export const shipmentsService = {
  tracking: (trackingNumber: string) =>
    api().api<Shipment>(`/shipments/tracking/${trackingNumber}`),
  all: () => api().api<Shipment[]>('/shipments'),
  advance: (id: string) => api().api<Shipment>(`/shipments/${id}/advance`, { method: 'POST' }),
  /**
   * Cotiza en tiempo real con Envia.com todas las opciones de envío para una
   * dirección: cada carrier/servicio con su precio real y su tiempo estimado.
   */
  quote: (params: {
    province: string
    city?: string
    postalCode: string
    address?: string
    number?: string
    items: { productId: string; quantity: number }[]
  }) =>
    api().api<{ options: ShippingOption[]; cost: number; currency: string }>('/shipments/quote', {
      method: 'POST',
      body: params,
    }),
  /** Sucursales de un carrier cerca de una dirección (retiro en sucursal). */
  branches: (params: { carrier: string; type?: 1 | 2 | 3; zipcode?: string; city?: string }) =>
    api().api<BranchInfo[]>('/shipments/branches', { query: params as Record<string, unknown> }),
  /** Datos del mapa de sucursales: origen de TOROX + sucursales cercanas (admin). */
  mapData: (params: { carrier?: string; type?: 1 | 2 | 3; limit?: number; radiusKm?: number } = {}) =>
    api().api<BranchesMapData>('/shipments/map', { query: params as Record<string, unknown> }),
  /** Carriers disponibles en Argentina (admin). */
  carriers: () => api().api<{ id: string; name: string; description?: string }[]>('/shipments/carriers'),
  /** Define la sucursal de Envia donde se dejan los paquetes (origen de los envíos). */
  setOriginBranch: (branch: BranchInfo) =>
    api().api<BranchInfo>('/shipments/origin-branch', {
      method: 'POST',
      body: branch as unknown as Record<string, unknown>,
    }),
  /**
   * Vuelve a usar la dirección del .env como origen de los envíos.
   * Con `carrier` borra sólo el origen de esa paquetería.
   */
  clearOriginBranch: (carrier?: string) =>
    api().api<{ cleared: boolean; carrier: string | null }>('/shipments/origin-branch', {
      method: 'DELETE',
      query: carrier ? { carrier } : undefined,
    }),
  /** Obtiene la URL de la etiqueta PDF de Envia.com (admin). */
  label: (id: string) => api().api<{ url: string | null }>(`/shipments/${id}/label`),
  /** Descarga la etiqueta PDF de Envia.com como archivo (admin). */
  downloadLabel: (id: string) =>
    api().api<Blob>(`/shipments/${id}/label/file`, { responseType: 'blob' }),
  /** Genera (o reintenta) la guía en Envia.com para un pedido (admin). */
  generateForOrder: (orderId: string) =>
    api().api<Shipment>(`/shipments/order/${orderId}/generate`, { method: 'POST' }),
  /** Sincroniza el estado del envío con la API de Envia.com (admin). */
  sync: (id: string) => api().api<Shipment>(`/shipments/${id}/sync`, { method: 'POST' }),
}

/* ---------- Finance ---------- */
export const financeService = {
  movements: (query: { page?: number; limit?: number; type?: string } = {}) =>
    api().list<FinanceMovement>(
      `/finance?${new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),
  summary: () =>
    api().api<{
      totalIncome: number
      totalExpense: number
      profit: number
      monthIncome: number
      monthExpense: number
      monthProfit: number
      movementCount: number
    }>('/finance/summary'),
  monthly: (months = 12) =>
    api().api<{ month: string; label: string; income: number; expense: number }[]>(
      `/finance/monthly?months=${months}`,
    ),
  byCategory: () =>
    api().api<{ category: string; amount: number }[]>('/finance/by-category'),
  recordExpense: (data: { category: string; description: string; amount: number; date?: string }) =>
    api().api('/finance/expenses', { method: 'POST', body: data }),
}

/* ---------- Dashboard ---------- */
export const dashboardService = {
  metrics: () => api().api<DashboardMetrics>('/dashboard/metrics'),
  salesByMonth: (months = 12) =>
    api().api<{ month: string; label: string; sales: number }[]>(
      `/dashboard/sales-by-month?months=${months}`,
    ),
  ordersByStatus: () =>
    api().api<{ status: string; count: number }[]>('/dashboard/orders-by-status'),
  topProducts: (limit = 5) =>
    api().api<{ productId: string; name: string; quantity: number; revenue: number }[]>(
      `/dashboard/top-products?limit=${limit}`,
    ),
}

/* ---------- Users / Customers ---------- */
export const usersService = {
  all: () => api().api<User[]>('/users'),
  get: (id: string) => api().api<User>(`/users/${id}`),
  updateMe: (data: Partial<User> & { password?: string }) => api().api<User>('/users/me', { method: 'PATCH', body: data as any }),
  update: (id: string, data: Partial<User>) =>
    api().api<User>(`/users/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api().api(`/users/${id}`, { method: 'DELETE' }),
}

export type { Paginated, Payment }