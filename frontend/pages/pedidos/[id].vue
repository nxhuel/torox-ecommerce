<script setup lang="ts">
import {
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Package,
  MapPin,
  CreditCard,
  Shield,
} from 'lucide-vue-next'
import type { Order } from '~/types'
import { ordersService } from '~/services'
import { useAuthStore } from '~/stores/auth'
import {
  ORDER_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  useFormat,
} from '~/composables/useFormat'

const route = useRoute()
const auth = useAuthStore()
const { currency, date } = useFormat()

const order = ref<Order | null>(null)
const loading = ref(true)
const notFound = ref(false)
const needsLogin = ref(false)

onMounted(async () => {
  auth.init()
  const id = String(route.params.id)
  try {
    order.value = await ordersService.get(id)
  } catch (error: any) {
    const status = error?.status
    if (status === 401 || error?.message?.includes('No tenés acceso')) {
      // Try the guest snapshot from checkout
      if (import.meta.client) {
        const saved = sessionStorage.getItem('torox_last_order')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.id === id) {
            order.value = parsed
          } else {
            needsLogin.value = true
          }
        } else {
          needsLogin.value = true
        }
      } else {
        needsLogin.value = true
      }
    } else {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
})

const paymentStatus = computed(() => {
  const status = order.value?.payment?.status
  if (status === 'APPROVED') return { label: 'Pago aprobado', icon: CheckCircle2, class: 'text-emerald-600 bg-emerald-50' }
  if (status === 'REJECTED') return { label: 'Pago rechazado', icon: XCircle, class: 'text-red-600 bg-red-50' }
  return { label: 'Pago pendiente de confirmación', icon: Clock, class: 'text-amber-600 bg-amber-50' }
})

const SHIPMENT_FLOW = ['PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']

const shipmentProgress = computed(() => {
  const status = order.value?.shipment?.status
  if (!status) return 0
  return (SHIPMENT_FLOW.indexOf(status) + 1) / SHIPMENT_FLOW.length * 100
})
</script>

<template>
  <div class="container-torox py-10">
    <div v-if="loading" class="mx-auto max-w-3xl space-y-4">
      <BaseSkeleton class="h-10 w-1/2" />
      <BaseSkeleton class="h-40 !rounded-xl" />
      <BaseSkeleton class="h-64 !rounded-xl" />
    </div>

    <div v-else-if="needsLogin" class="mx-auto max-w-md">
      <EmptyState
        icon="package"
        title="Necesitás iniciar sesión"
        description="Para ver este pedido, ingresá con la cuenta con la que lo compraste."
      >
        <NuxtLink :to="`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`" class="btn-primary">
          Ingresá
        </NuxtLink>
      </EmptyState>
    </div>

    <div v-else-if="notFound || !order" class="mx-auto max-w-md">
      <EmptyState icon="search" title="Pedido no encontrado" description="No pudimos encontrar este pedido.">
        <NuxtLink to="/" class="btn-primary">Volver al inicio</NuxtLink>
      </EmptyState>
    </div>

    <template v-else>
      <div class="mx-auto max-w-4xl">
        <!-- Header -->
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 class="h-9 w-9" />
          </div>
          <h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">
            ¡Gracias por tu compra!
          </h1>
          <p class="mt-2 text-slate-500">
            Pedido <span class="font-bold text-slate-800">{{ order.orderNumber }}</span> registrado el {{ date(order.createdAt) }}
          </p>
        </div>

        <!-- Status banner -->
        <div class="mb-6 flex items-center justify-between gap-4 rounded-xl border p-5" :class="paymentStatus.class">
          <div class="flex items-center gap-3">
            <component :is="paymentStatus.icon" class="h-8 w-8" />
            <div>
              <p class="font-bold">{{ paymentStatus.label }}</p>
              <p class="text-sm opacity-80">{{ order.payment?.message || 'Estado del pago' }}</p>
            </div>
          </div>
          <span class="hidden rounded-full border border-current px-3 py-1 text-sm font-bold sm:block">
            {{ ORDER_STATUS_LABELS[order.status] || order.status }}
          </span>
        </div>

        <div class="grid gap-6 lg:grid-cols-5">
          <!-- Tracking -->
          <div class="lg:col-span-3">
            <div class="card p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Truck class="h-5 w-5 text-brand-600" /> Seguimiento del envío
                </h2>
                <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {{ order.shipment?.carrier || 'ANDREANI (SIMULADO)' }}
                </span>
              </div>

              <template v-if="order.shipment">
                <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3">
                  <div>
                    <p class="text-xs text-slate-400">Código de seguimiento</p>
                    <p class="font-mono text-sm font-bold text-slate-900">{{ order.shipment.trackingNumber }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-slate-400">Entrega estimada</p>
                    <p class="text-sm font-bold text-slate-800">{{ date(order.shipment.estimatedDelivery) }}</p>
                  </div>
                </div>

                <!-- Progress -->
                <div class="mt-6">
                  <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all duration-700" :style="{ width: `${shipmentProgress}%` }" />
                  </div>
                  <div class="mt-4 space-y-4">
                    <div
                      v-for="(status, index) in SHIPMENT_FLOW"
                      :key="status"
                      class="flex gap-3"
                    >
                      <div class="flex flex-col items-center">
                        <span
                          class="flex h-6 w-6 items-center justify-center rounded-full text-white"
                          :class="SHIPMENT_FLOW.indexOf(order.shipment!.status) >= index ? 'bg-emerald-500' : 'bg-slate-200'"
                        >
                          <CheckCircle2 v-if="SHIPMENT_FLOW.indexOf(order.shipment!.status) > index" class="h-3.5 w-3.5" />
                          <span v-else class="h-2 w-2 rounded-full" :class="SHIPMENT_FLOW.indexOf(order.shipment!.status) >= index ? 'bg-white' : ''" />
                        </span>
                        <span v-if="index < SHIPMENT_FLOW.length - 1" class="mt-1 h-full w-0.5 flex-1" :class="SHIPMENT_FLOW.indexOf(order.shipment!.status) > index ? 'bg-emerald-500' : 'bg-slate-200'" />
                      </div>
                      <div class="pb-2">
                        <p class="text-sm font-bold" :class="SHIPMENT_FLOW.indexOf(order.shipment!.status) >= index ? 'text-slate-900' : 'text-slate-400'">
                          {{ SHIPMENT_STATUS_LABELS[status] }}
                        </p>
                        <p v-if="order.shipment.events" class="text-xs text-slate-500">
                          {{ order.shipment.events.find((e) => e.status === status)?.description || 'Pendiente' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <div v-else class="py-6 text-center text-sm text-slate-500">
                <Package class="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p v-if="order.status === 'PENDING_PAYMENT'">
                  El envío se generará cuando el pago sea confirmado.
                </p>
                <p v-else>El envío todavía no fue generado.</p>
              </div>
            </div>

            <!-- Payment -->
            <div class="card mt-6 p-6">
              <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <CreditCard class="h-5 w-5 text-brand-600" /> Detalle del pago
              </h2>
              <div class="grid gap-3 text-sm sm:grid-cols-2">
                <div class="rounded-lg bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Método</p>
                  <p class="mt-0.5 font-semibold text-slate-800">
                    {{ PAYMENT_METHOD_LABELS[order.payment?.method || ''] || '—' }}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Referencia</p>
                  <p class="mt-0.5 font-mono font-semibold text-slate-800">{{ order.payment?.reference || '—' }}</p>
                </div>
                <div class="rounded-lg bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Monto</p>
                  <p class="mt-0.5 font-bold text-slate-900">{{ currency(order.payment?.amount) }}</p>
                </div>
                <div class="rounded-lg bg-slate-50 p-3">
                  <p class="text-xs text-slate-400">Estado</p>
                  <p class="mt-0.5 font-semibold" :class="{ 'text-emerald-600': order.payment?.status === 'APPROVED', 'text-amber-600': order.payment?.status === 'PENDING', 'text-red-600': order.payment?.status === 'REJECTED' }">
                    {{ order.payment?.status || '—' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Items + shipping address -->
          <div class="space-y-6 lg:col-span-2">
            <div class="card p-6">
              <h2 class="mb-4 text-lg font-bold text-slate-900">Productos</h2>
              <div class="space-y-4">
                <div v-for="item in order.items" :key="item.id" class="flex gap-3">
                  <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <AppImage :src="item.image" :alt="item.name" :seed="item.productId" class="h-full w-full" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="line-clamp-2 text-sm font-semibold text-slate-800">{{ item.name }}</p>
                    <p class="mt-0.5 text-xs text-slate-400">{{ item.sku }}</p>
                    <div class="mt-1 flex justify-between text-sm">
                      <span class="text-slate-500">{{ item.quantity }} × {{ currency(item.unitPrice) }}</span>
                      <span class="font-bold text-slate-900">{{ currency(item.subtotal) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
                <div class="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>{{ currency(order.subtotal) }}</span>
                </div>
                <div v-if="order.discount > 0" class="flex justify-between text-emerald-600">
                  <span>Descuento</span><span>-{{ currency(order.discount) }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Envío</span><span>{{ order.shippingCost === 0 ? 'Gratis' : currency(order.shippingCost) }}</span>
                </div>
                <div class="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                  <span>Total</span><span>{{ currency(order.total) }}</span>
                </div>
              </div>
            </div>

            <div class="card p-6">
              <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <MapPin class="h-5 w-5 text-brand-600" /> Envío a
              </h2>
              <p class="text-sm font-semibold text-slate-800">{{ order.customerName }}</p>
              <p class="text-sm text-slate-600">
                {{ order.shippingAddress.address }} {{ order.shippingAddress.number }}
                <template v-if="order.shippingAddress.apartment">, {{ order.shippingAddress.apartment }}</template>
              </p>
              <p class="text-sm text-slate-600">
                {{ order.shippingAddress.city }}, {{ order.shippingAddress.province }} (CP {{ order.shippingAddress.postalCode }})
              </p>
              <div class="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                <Shield class="h-4 w-4 shrink-0" />
                Compra protegida por TOROX
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>