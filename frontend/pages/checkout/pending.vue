<script setup lang="ts">
import { Clock, Loader2 } from 'lucide-vue-next'
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
    const status = await confirmWithMercadoPago(orderId.value)
    if (status === 'APPROVED' || status === 'ALREADY_APPROVED') {
      router.replace(`/checkout/success?orderId=${orderId.value}`)
      return
    }
    order.value = await ordersService.get(orderId.value)
    toast.info('Tu pago está siendo procesado. Recibirás una notificación cuando sea confirmado.')
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
        <Loader2 class="mx-auto h-12 w-12 animate-spin text-amber-600" />
        <p class="mt-4 text-lg font-medium text-slate-600">Verificando estado del pago...</p>
      </div>
      
      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p class="text-lg font-medium text-red-700">{{ error }}</p>
        <button class="mt-4 btn-primary" @click="router.push('/')">
          Volver al inicio
        </button>
      </div>
      
      <div v-else class="space-y-6">
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-8">
          <Clock class="mx-auto h-16 w-16 text-amber-600" />
          <h1 class="mt-4 text-2xl font-bold text-amber-900">Pago pendiente</h1>
          <p class="mt-2 text-lg text-amber-700">
            Estamos verificando tu pago. Esto puede tomar unos momentos.
          </p>
          <p class="mt-1 text-sm text-amber-600">
            Recibirás una notificación cuando el pago sea confirmado.
          </p>
        </div>
        
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 class="text-lg font-bold text-slate-900">Detalles del pedido</h2>
          <div class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Pedido</span>
              <span class="font-semibold">{{ order?.orderNumber }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Estado actual</span>
              <span class="font-semibold text-amber-600">Pendiente de confirmación</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Total</span>
              <span class="font-semibold text-slate-900">${{ order?.total?.toLocaleString('es-AR') }}</span>
            </div>
          </div>
        </div>
        
        <div>
          <button class="btn-primary" @click="router.push(`/pedidos/${orderId}`)">
            Ver detalle del pedido
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
