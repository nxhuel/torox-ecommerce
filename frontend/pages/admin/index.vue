<script setup lang="ts">
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Wallet,
  ArrowRight,
} from 'lucide-vue-next'
import type { DashboardMetrics } from '~/types'
import { dashboardService } from '~/services'
import { ORDER_STATUS_LABELS, useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { currency } = useFormat()
const metrics = ref<DashboardMetrics | null>(null)
const salesByMonth = ref<{ label: string; value: number }[]>([])
const ordersByStatus = ref<{ status: string; count: number }[]>([])
const topProducts = ref<{ name: string; quantity: number; revenue: number }[]>([])
const loading = ref(true)

const statusColors: Record<string, string> = {
  PENDING_PAYMENT: '#f59e0b',
  PAYMENT_APPROVED: '#10b981',
  PROCESSING: '#3b82f6',
  SHIPPED: '#6366f1',
  DELIVERED: '#059669',
  CANCELLED: '#ef4444',
}

onMounted(async () => {
  try {
    const [m, sales, statuses, top] = await Promise.all([
      dashboardService.metrics(),
      dashboardService.salesByMonth(8),
      dashboardService.ordersByStatus(),
      dashboardService.topProducts(5),
    ])
    metrics.value = m
    salesByMonth.value = sales.map((s) => ({ label: s.label, value: s.sales }))
    ordersByStatus.value = statuses.filter((s) => s.count > 0)
    topProducts.value = top
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Metrics -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseSkeleton v-for="i in 8" :key="i" class="h-28 !rounded-xl" />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Ventas totales" :value="currency(metrics?.totalSales)" :icon="DollarSign" accent="emerald" />
      <StatCard title="Ventas del mes" :value="currency(metrics?.monthSales)" :icon="TrendingUp" accent="brand" />
      <StatCard title="Pedidos" :value="String(metrics?.totalOrders)" :icon="ShoppingBag" accent="indigo" :hint="`${metrics?.pendingOrders} pendientes de pago`" />
      <StatCard title="Clientes" :value="String(metrics?.customersCount)" :icon="Users" accent="emerald" />
    </div>

    <div v-if="!loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Ticket promedio" :value="currency(metrics?.avgTicket)" :icon="Wallet" accent="amber" />
      <StatCard title="Pagos pendientes" :value="String(metrics?.pendingPayments)" :icon="CreditCard" accent="red" />
      <StatCard
        title="Ganancia estimada"
        :value="currency(metrics?.profit)"
        :icon="DollarSign"
        :accent="(metrics?.profit || 0) >= 0 ? 'emerald' : 'red'"
      />
    </div>

    <!-- Alerts -->
    <div v-if="!loading && (metrics?.lowStockCount || metrics?.pendingOrders || metrics?.pendingPayments)" class="grid gap-4 lg:grid-cols-3">
      <div v-if="metrics?.lowStockCount" class="card p-5">
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 text-amber-500" />
          <h3 class="font-bold text-slate-900">Stock bajo ({{ metrics.lowStockCount }})</h3>
        </div>
        <div class="mt-3 space-y-2">
          <div v-for="p in metrics.lowStockProducts.slice(0, 4)" :key="p.id" class="flex items-center justify-between text-sm">
            <span class="truncate pr-2 text-slate-600">{{ p.name }}</span>
            <span class="shrink-0 font-bold" :class="p.stock <= 2 ? 'text-red-600' : 'text-amber-600'">{{ p.stock }} u.</span>
          </div>
        </div>
        <NuxtLink to="/admin/productos" class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Ver productos <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div v-if="metrics?.pendingOrders" class="card p-5">
        <div class="flex items-center gap-2">
          <ClipboardList class="h-5 w-5 text-brand-600" />
          <h3 class="font-bold text-slate-900">Pedidos pendientes ({{ metrics.pendingOrders }})</h3>
        </div>
        <p class="mt-2 text-sm text-slate-500">Pedidos esperando confirmación de pago.</p>
        <NuxtLink to="/admin/pedidos?status=PENDING_PAYMENT" class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Revisar pedidos <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>

      <div v-if="metrics?.pendingPayments" class="card p-5">
        <div class="flex items-center gap-2">
          <CreditCard class="h-5 w-5 text-amber-500" />
          <h3 class="font-bold text-slate-900">Pagos pendientes ({{ metrics.pendingPayments }})</h3>
        </div>
        <p class="mt-2 text-sm text-slate-500">Aprobá o rechazá los pagos de tus clientes.</p>
        <NuxtLink to="/admin/pedidos?status=PENDING_PAYMENT" class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
          Gestionar pagos <ArrowRight class="h-3.5 w-3.5" />
        </NuxtLink>
      </div>
    </div>

    <!-- Charts -->
    <div v-if="!loading" class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="mb-6 font-bold text-slate-900">Ventas por mes</h3>
        <BarChart :data="salesByMonth" color="bg-brand-500" :format="(v: number) => currency(v)" />
      </div>
      <div class="card p-6">
        <h3 class="mb-6 font-bold text-slate-900">Pedidos por estado</h3>
        <DonutChart
          :data="ordersByStatus.map((s) => ({ label: ORDER_STATUS_LABELS[s.status] || s.status, value: s.count, color: statusColors[s.status] || '#94a3b8' }))"
        />
      </div>
    </div>

    <!-- Top products -->
    <div v-if="!loading && topProducts.length" class="card p-6">
      <h3 class="mb-5 font-bold text-slate-900">Productos más vendidos</h3>
      <div class="space-y-4">
        <div v-for="(product, index) in topProducts" :key="product.name" class="flex items-center gap-4">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" :class="index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'">
            {{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-800">{{ product.name }}</p>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400" :style="{ width: `${(product.quantity / topProducts[0].quantity) * 100}%` }" />
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-slate-900">{{ product.quantity }} u.</p>
            <p class="text-xs text-slate-400">{{ currency(product.revenue) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>