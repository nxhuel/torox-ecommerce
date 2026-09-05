<script setup lang="ts">
import { Package, ChevronRight, ArrowRight } from 'lucide-vue-next'
import type { Order } from '~/types'
import { ordersService } from '~/services'
import { ORDER_STATUS_LABELS, useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'account', middleware: 'auth' })

const { currency, date } = useFormat()
const orders = ref<Order[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    orders.value = await ordersService.mine()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-slate-900">Mis compras</h1>

    <div v-if="loading" class="space-y-4">
      <BaseSkeleton v-for="i in 3" :key="i" class="h-24 !rounded-xl" />
    </div>

    <div v-else-if="orders.length" class="space-y-4">
      <NuxtLink
        v-for="order in orders"
        :key="order.id"
        :to="`/pedidos/${order.id}`"
        class="block rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-brand-300 hover:shadow-card-hover"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <p class="font-bold text-slate-900">{{ order.orderNumber }}</p>
              <StatusBadge :label="ORDER_STATUS_LABELS[order.status] || order.status" :status="order.status" />
            </div>
            <p class="mt-1 text-sm text-slate-500">{{ date(order.createdAt) }} • {{ order.items.length }} producto(s)</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm text-slate-400">Total</p>
              <p class="text-lg font-bold text-slate-900">{{ currency(order.total) }}</p>
            </div>
            <ChevronRight class="h-5 w-5 text-slate-300" />
          </div>
        </div>
        <div class="mt-3 flex gap-2">
          <div
            v-for="item in order.items.slice(0, 5)"
            :key="item.id"
            class="h-11 w-11 overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
          >
            <AppImage :src="item.image" :alt="item.name" :seed="item.productId" class="h-full w-full" />
          </div>
          <span v-if="order.items.length > 5" class="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
            +{{ order.items.length - 5 }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <EmptyState
      v-else
      icon="package"
      title="No tenés compras todavía"
      description="Cuando realices tu primera compra, la vas a poder seguir acá."
    >
      <NuxtLink to="/productos" class="btn-primary">
        Ver productos <ArrowRight class="h-4 w-4" />
      </NuxtLink>
    </EmptyState>
  </div>
</template>