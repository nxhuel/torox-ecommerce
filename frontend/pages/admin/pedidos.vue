<script setup lang="ts">
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  MapPin,
  CreditCard,
  ChevronRight,
} from 'lucide-vue-next'
import type { Order } from '~/types'
import { ordersService, shipmentsService } from '~/services'
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  SHIPMENT_STATUS_LABELS,
  useFormat,
} from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const { currency, dateTime } = useFormat()
const toast = useToast()

const orders = ref<Order[]>([])
const loading = ref(true)
const total = ref(0)
const search = ref('')
const status = ref(String(route.query.status || ''))
const page = ref(1)
const totalPages = ref(1)
const limit = 10

const selected = ref<Order | null>(null)
const detailLoading = ref(false)
const actionLoading = ref(false)
const rejectReason = ref('')

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING_PAYMENT', label: 'Pago pendiente' },
  { value: 'PAYMENT_APPROVED', label: 'Pago aprobado' },
  { value: 'PROCESSING', label: 'En preparación' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

onMounted(load)

async function load() {
  loading.value = true
  try {
    const result = await ordersService.all({
      status: status.value || undefined,
      search: search.value || undefined,
      page: page.value,
      limit,
    })
    orders.value = result.items
    total.value = result.meta?.total || 0
    totalPages.value = result.meta?.totalPages || 1
  } finally {
    loading.value = false
  }
}

function changeStatus(value: string) {
  status.value = value
  page.value = 1
  load()
}

async function openDetail(orderId: string) {
  detailLoading.value = true
  try {
    selected.value = await ordersService.get(orderId)
    rejectReason.value = ''
  } finally {
    detailLoading.value = false
  }
}

async function runAction(fn: () => Promise<any>, successMessage: string) {
  actionLoading.value = true
  try {
    await fn()
    toast.success(successMessage)
    if (selected.value) selected.value = await ordersService.get(selected.value.id)
    await load()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    actionLoading.value = false
  }
}

const approvePayment = () =>
  selected.value && runAction(() => ordersService.approvePayment(selected.value!.id), 'Pago aprobado')

const rejectPayment = () =>
  selected.value &&
  runAction(() => ordersService.rejectPayment(selected.value!.id, rejectReason.value || 'Pago rechazado'), 'Pago rechazado')

const advanceShipment = () =>
  selected.value?.shipment &&
  runAction(() => shipmentsService.advance(selected.value!.shipment!.id), 'Envío avanzado')

const changeOrderStatus = (next: string) =>
  selected.value && runAction(() => ordersService.updateStatus(selected.value!.id, next), 'Estado actualizado')

const cancelOrder = () =>
  selected.value &&
  runAction(() => ordersService.cancel(selected.value!.id, 'Cancelado por el administrador'), 'Pedido cancelado')

const nextShipment = computed(() => {
  if (!selected.value?.shipment) return null
  const flow = ['PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
  const index = flow.indexOf(selected.value.shipment.status)
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null
})

const canProcess = computed(() => selected.value?.status === 'PAYMENT_APPROVED')
const canShip = computed(() => ['PAYMENT_APPROVED', 'PROCESSING'].includes(selected.value?.status || ''))
const canDeliver = computed(() => selected.value?.status === 'SHIPPED')
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Pedidos</h2>
        <p class="text-sm text-slate-500">{{ total }} pedidos</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-[220px] flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="search"
          class="input-base !pl-9"
          placeholder="Buscar por número, cliente o email..."
          @keydown.enter="page = 1; load()"
        />
      </div>
      <select v-model="status" class="input-base !w-auto" @change="changeStatus(status)">
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="space-y-3 p-6">
        <BaseSkeleton v-for="i in 6" :key="i" class="h-16" />
      </div>
      <div v-else-if="orders.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Pedido</th>
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Total</th>
              <th class="px-4 py-3">Pago</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
              class="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/50"
              @click="openDetail(order.id)"
            >
              <td class="px-4 py-3 font-bold text-slate-900">{{ order.orderNumber }}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-800">{{ order.customerName }}</p>
                <p class="text-xs text-slate-400">{{ order.customerEmail }}</p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ dateTime(order.createdAt) }}</td>
              <td class="px-4 py-3 font-bold text-slate-900">{{ currency(order.total) }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="{
                    'bg-emerald-50 text-emerald-700': order.payment?.status === 'APPROVED',
                    'bg-amber-50 text-amber-700': order.payment?.status === 'PENDING',
                    'bg-red-50 text-red-700': order.payment?.status === 'REJECTED',
                  }"
                >
                  {{ order.payment?.status || '—' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :label="ORDER_STATUS_LABELS[order.status] || order.status" :status="order.status" />
              </td>
              <td class="px-4 py-3 text-right">
                <ChevronRight class="ml-auto h-4 w-4 text-slate-300" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else icon="package" title="No hay pedidos" description="Cuando los clientes compren, sus pedidos aparecerán acá." />
    </div>

    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <button
        v-for="p in totalPages"
        :key="p"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
        :class="p === page ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'"
        @click="page = p; load()"
      >
        {{ p }}
      </button>
    </div>

    <!-- Detail modal -->
    <BaseModal :open="!!selected" title="Detalle del pedido" size="lg" @close="selected = null">
      <div v-if="detailLoading" class="space-y-3">
        <BaseSkeleton v-for="i in 4" :key="i" class="h-16" />
      </div>
      <template v-else-if="selected">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-lg font-bold text-slate-900">{{ selected.orderNumber }}</p>
            <p class="text-sm text-slate-500">{{ dateTime(selected.createdAt) }} • {{ selected.customerEmail }}</p>
          </div>
          <StatusBadge :label="ORDER_STATUS_LABELS[selected.status] || selected.status" :status="selected.status" />
        </div>

        <!-- Payment actions -->
        <div v-if="selected.payment?.status === 'PENDING'" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div class="flex items-center gap-2 font-bold text-amber-800">
            <CreditCard class="h-4 w-4" /> Pago pendiente de confirmación
          </div>
          <p class="mt-1 text-xs text-amber-700">
            {{ PAYMENT_METHOD_LABELS[selected.payment.method] }} — Referencia {{ selected.payment.reference }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="btn !bg-emerald-600 !px-4 !py-2 !text-white hover:!bg-emerald-700" :disabled="actionLoading" @click="approvePayment">
              <CheckCircle2 class="h-4 w-4" /> Aprobar pago
            </button>
            <input
              v-model="rejectReason"
              class="input-base !w-56 !py-1.5"
              placeholder="Motivo del rechazo (opcional)"
            />
            <button class="btn !bg-red-600 !px-4 !py-2 !text-white hover:!bg-red-700" :disabled="actionLoading" @click="rejectPayment">
              <XCircle class="h-4 w-4" /> Rechazar
            </button>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Items -->
          <div>
            <h3 class="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Package class="h-4 w-4" /> Productos ({{ selected.items.length }})
            </h3>
            <div class="space-y-2.5">
              <div v-for="item in selected.items" :key="item.id" class="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <AppImage :src="item.image" :alt="item.name" :seed="item.productId" class="h-full w-full" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-slate-800">{{ item.name }}</p>
                  <p class="text-xs text-slate-400">{{ item.quantity }} × {{ currency(item.unitPrice) }}</p>
                </div>
                <p class="shrink-0 text-sm font-bold text-slate-900">{{ currency(item.subtotal) }}</p>
              </div>
            </div>
            <div class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <div class="flex justify-between text-slate-600"><span>Subtotal</span><span>{{ currency(selected.subtotal) }}</span></div>
              <div v-if="selected.discount > 0" class="flex justify-between text-emerald-600"><span>Descuento</span><span>-{{ currency(selected.discount) }}</span></div>
              <div class="flex justify-between text-slate-600"><span>Envío</span><span>{{ selected.shippingCost === 0 ? 'Sin costo' : currency(selected.shippingCost) }}</span></div>
              <div class="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>{{ currency(selected.total) }}</span></div>
            </div>
          </div>

          <!-- Info -->
          <div class="space-y-4">
            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <MapPin class="h-4 w-4" /> Envío a
              </h3>
              <div class="rounded-lg border border-slate-100 p-3 text-sm">
                <p class="font-semibold text-slate-800">{{ selected.customerName }}</p>
                <p class="text-slate-600">
                  {{ selected.shippingAddress.address }} {{ selected.shippingAddress.number }}
                  <template v-if="selected.shippingAddress.apartment">, {{ selected.shippingAddress.apartment }}</template>
                </p>
                <p class="text-slate-500">{{ selected.shippingAddress.city }}, {{ selected.shippingAddress.province }} ({{ selected.shippingAddress.postalCode }})</p>
                <p class="mt-1 text-xs text-slate-400">Tel: {{ selected.customerPhone || '—' }}</p>
              </div>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <Truck class="h-4 w-4" /> Envío
              </h3>
              <div v-if="selected.shipment" class="rounded-lg border border-slate-100 p-3">
                <div class="flex items-center justify-between">
                  <p class="font-mono text-sm font-bold text-slate-800">{{ selected.shipment.trackingNumber }}</p>
                  <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {{ SHIPMENT_STATUS_LABELS[selected.shipment.status] }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-slate-400">
                  {{ selected.shipment.carrier }} • Entrega estimada {{ dateTime(selected.shipment.estimatedDelivery) }}
                </p>
                <button
                  v-if="nextShipment"
                  class="btn-secondary mt-3 !py-1.5 !text-xs"
                  :disabled="actionLoading"
                  @click="advanceShipment"
                >
                  <Truck class="h-3.5 w-3.5" />
                  Avanzar a {{ SHIPMENT_STATUS_LABELS[nextShipment] }}
                </button>
              </div>
              <p v-else class="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400">
                Envío aún no generado
              </p>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <Package class="h-4 w-4" /> Paquete (peso y medidas usados)
              </h3>
              <div v-if="selected.packageDetails" class="rounded-lg border border-slate-100 p-3 text-sm">
                <div class="grid gap-1.5 sm:grid-cols-2">
                  <div>
                    <p class="text-xs text-slate-400">Peso total</p>
                    <p class="font-medium text-slate-800">{{ selected.packageDetails.weightKg.toFixed(2) }} kg</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-400">Valor declarado (seguro)</p>
                    <p class="font-medium text-slate-800">{{ currency(selected.packageDetails.declaredValue) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-400">Ancho × Alto × Largo</p>
                    <p class="font-medium text-slate-800">
                      {{ selected.packageDetails.widthCm }} × {{ selected.packageDetails.heightCm }} × {{ selected.packageDetails.lengthCm }} cm
                    </p>
                  </div>
                </div>
                <p v-if="selected.shipment?.trackUrl" class="mt-2 text-xs text-slate-400">
                  El cliente puede rastrear en:
                  <a :href="selected.shipment.trackUrl" class="text-brand-600 hover:underline" target="_blank" rel="noopener">
                    envía.com/rastreo
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h3 class="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Cambiar estado del pedido</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-if="canProcess"
                  class="btn-secondary !py-1.5 !text-xs"
                  :disabled="actionLoading"
                  @click="changeOrderStatus('PROCESSING')"
                >
                  Marcar en preparación
                </button>
                <button
                  v-if="canShip"
                  class="btn-secondary !py-1.5 !text-xs"
                  :disabled="actionLoading"
                  @click="changeOrderStatus('SHIPPED')"
                >
                  Marcar enviado
                </button>
                <button
                  v-if="canDeliver"
                  class="btn-secondary !py-1.5 !text-xs"
                  :disabled="actionLoading"
                  @click="changeOrderStatus('DELIVERED')"
                >
                  Marcar entregado
                </button>
                <button
                  v-if="!['DELIVERED', 'CANCELLED'].includes(selected.status)"
                  class="btn !bg-red-50 !px-3 !py-1.5 !text-xs !text-red-600 hover:!bg-red-100"
                  :disabled="actionLoading"
                  @click="cancelOrder"
                >
                  Cancelar pedido
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <span class="font-bold text-slate-600">Notas:</span>
          {{ selected.notes || 'Sin notas' }}
        </div>
      </template>
    </BaseModal>
  </div>
</template>