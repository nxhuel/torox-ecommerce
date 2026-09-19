<script setup lang="ts">
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import { ordersService } from '~/services'
import { useCartStore } from '~/stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const toast = useToast()

const orderId = computed(() => route.query.orderId as string)
const order = ref<any>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  if (!orderId.value) {
    error.value = 'Pedido no encontrado'
    loading.value = false
    return
  }

  try {
    order.value = await ordersService.get(orderId.value)
    toast.error('El pago fue rechazado. El pedido ha sido cancelado.')
    
    // Clear the cart since the order was cancelled
    if (cart.cart) {
      await cart.clear()
    }
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
        <div class="rounded-xl border border-red-200 bg-red-50 p-8">
          <AlertCircle class="mx-auto h-16 w-16 text-red-600" />
          <h1 class="mt-4 text-2xl font-bold text-red-900">Pago rechazado</h1>
          <p class="mt-2 text-lg text-red-700">
            Tu pago no pudo ser procesado.
          </p>
          <p class="mt-1 text-sm text-red-600">
            El pedido ha sido cancelado. Puedes intentar de nuevo o usar otro método de pago.
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
              <span class="text-slate-600">Estado</span>
              <span class="font-semibold text-red-600">Cancelado</span>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col gap-3">
          <button class="btn-primary" @click="router.push('/carrito')">
            Volver al carrito
          </button>
          <button class="btn-secondary" @click="router.push('/')">
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
