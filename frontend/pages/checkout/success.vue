<script setup lang="ts">
import { CheckCircle, Loader2 } from 'lucide-vue-next'
import { ordersService } from '~/services'
import { useApi } from '~/composables/useApi'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const toast = useToast()

const { api } = useApi()
const orderId = computed(() => route.query.orderId as string)
const order = ref<any>(null)
const loading = ref(true)
const error = ref('')
const paymentStatus = ref('')

/**
 * Al volver de Mercado Pago le pedimos al backend que consulte a MP el estado
 * real del pago. Así el pedido se confirma (y se genera la guía de envío)
 * aunque el aviso automático (webhook) de Mercado Pago no llegue.
 * MP a veces tarda unos segundos en registrar el pago: reintentamos.
 */
async function confirmWithMercadoPago(id: string): Promise<string> {
  let status = 'NOT_FOUND'
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await api<{ status: string }>(`/payments/mercadopago/confirm/${id}`, { method: 'POST' })
      status = res.status
      if (status !== 'NOT_FOUND' && status !== 'PENDING') return status
    } catch {
      /* si falla seguimos: el webhook puede confirmarlo igual */
    }
    await new Promise((r) => setTimeout(r, 2500))
  }
  return status
}

onMounted(async () => {
  if (!orderId.value) {
    error.value = 'Pedido no encontrado'
    loading.value = false
    return
  }

  try {
    paymentStatus.value = await confirmWithMercadoPago(orderId.value)
    order.value = await ordersService.get(orderId.value)

    // Clear the cart after successful purchase
    if (cart.cart) {
      await cart.clear()
    }
    
    // Redirect to order detail after a moment
    setTimeout(() => {
      router.replace(`/pedidos/${orderId.value}`)
    }, 5000)
  } catch (err: any) {
    error.value = err.message || 'Error al cargar el pedido'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container-torox py-12 w-full">
    <div class="mx-auto max-w-lg text-center">
      <div v-if="loading" class="py-12">
        <Loader2 class="mx-auto h-12 w-12 animate-spin text-brand-600" />
        <p class="mt-4 text-lg font-medium text-slate-600">Cargando información del pedido...</p>
      </div>
      
      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-lg font-medium text-red-700">{{ error }}</p>
        <button class="mt-4 btn-primary" @click="router.push('/')">
          Volver al inicio
        </button>
      </div>
      
      <div v-else-if="order" class="space-y-6">
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-8">
          <CheckCircle class="mx-auto h-16 w-16 text-emerald-600" />
          <h1 class="mt-4 text-2xl font-bold text-emerald-900">
            {{ order.status === 'PENDING_PAYMENT' ? 'Estamos confirmando tu pago' : '¡Pago exitoso!' }}
          </h1>
          <p class="mt-2 text-lg text-emerald-700">
            Tu pedido <strong>{{ order.orderNumber }}</strong> ha sido confirmado.
          </p>
          <p class="mt-1 text-sm text-emerald-600">
            Recibirás un email de confirmación en breve con los detalles de tu pedido y el código de seguimiento.
          </p>
        </div>
        
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 class="text-lg font-bold text-slate-900">Resumen del pedido</h2>
          <div class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Estado</span>
              <span class="font-semibold" :class="order.status === 'PENDING_PAYMENT' ? 'text-amber-600' : 'text-emerald-600'">
                {{ order.status === 'PENDING_PAYMENT' ? 'Confirmando con Mercado Pago' : 'Pagado' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Total pagado</span>
              <span class="font-semibold text-slate-900">${{ order.total?.toLocaleString('es-AR') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Artículos</span>
              <span class="font-semibold">{{ order.items?.length }}</span>
            </div>
          </div>
        </div>
        
        <p class="text-sm text-slate-500">
          Redirigiendo al detalle del pedido en 5 segundos...
        </p>
      </div>
    </div>
  </div>
</template>
