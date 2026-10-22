export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pago pendiente',
  PAYMENT_APPROVED: 'Pago aprobado',
  PROCESSING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYMENT_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PREPARING: 'Preparando',
  PICKED_UP: 'Retirado por el correo',
  IN_TRANSIT: 'En tránsito',
  OUT_FOR_DELIVERY: 'En reparto',
  DELIVERED: 'Entregado',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito',
  BANK_TRANSFER: 'Transferencia bancaria',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprobado',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazado',
}

export const PROMOTION_TYPE_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: 'Descuento porcentual',
  FIXED_DISCOUNT: 'Descuento fijo',
  FREE_SHIPPING: 'Envío gratis',
  SPECIAL_OFFER: 'Oferta especial',
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  PROMOTION: 'Promoción',
  OFFER: 'Oferta',
  ORDER_STATUS: 'Pedido',
  SHIPMENT_STATUS: 'Envío',
  SYSTEM: 'Sistema',
}

export const MOVEMENT_CATEGORY_LABELS: Record<string, string> = {
  SALE: 'Venta',
  MERCHANDISE: 'Mercadería',
  LOGISTICS: 'Logística',
  ADVERTISING: 'Publicidad',
  SALARY: 'Sueldos',
  OTHER: 'Otros',
}

export const useFormat = () => {
  const currency = (value: number | string | null | undefined): string => {
    const num = Number(value || 0)
    return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 2 })
  }

  /**
   * Formats a percentage for display (max 2 integer digits, 2 decimal digits).
   * Keeps whole percentages like "5" and trims long backend values like 21,95122 → 21,95.
   */
  const percentage = (value: number | string | null | undefined): string => {
    const num = Number(value || 0)
    return num.toLocaleString('es-AR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
  }

  const date = (value: string | Date | null | undefined): string => {
    if (!value) return '—'
    const d = typeof value === 'string' ? new Date(value) : value
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const dateTime = (value: string | Date | null | undefined): string => {
    if (!value) return '—'
    const d = typeof value === 'string' ? new Date(value) : value
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /** Human readable value for a promotion: 20% / $10.000 / envío gratis. */
  const promotionValue = (
    promotion: { type?: string; value?: number | string } | null | undefined,
  ): string => {
    if (!promotion) return ''
    const value = Number(promotion.value || 0)
    if (promotion.type === 'PERCENTAGE_DISCOUNT') return `${percentage(value)}%`
    if (promotion.type === 'FREE_SHIPPING') {
      return value > 0 ? `Envío gratis desde ${currency(value)}` : 'Envío gratis'
    }
    return currency(value)
  }

  return { currency, percentage, date, dateTime, promotionValue }
}