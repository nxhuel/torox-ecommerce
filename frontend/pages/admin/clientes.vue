<script setup lang="ts">
import { Search, Users, ChevronRight, Mail, Phone, CalendarDays } from 'lucide-vue-next'
import type { Order, User } from '~/types'
import { ordersService, usersService } from '~/services'
import { useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { currency, date } = useFormat()
const customers = ref<User[]>([])
const loading = ref(true)
const search = ref('')
const selected = ref<User | null>(null)
const selectedOrders = ref<Order[]>([])
const detailLoading = ref(false)

onMounted(load)

async function load() {
  loading.value = true
  try {
    customers.value = await usersService.all()
  } finally {
    loading.value = false
  }
}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return customers.value
  return customers.value.filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q),
  )
})

async function openDetail(customer: User) {
  selected.value = customer
  detailLoading.value = true
  try {
    const all = await ordersService.mine().catch(() => [])
    selectedOrders.value = all.filter((o) => o.userId === customer.id)
  } catch {
    selectedOrders.value = []
  } finally {
    detailLoading.value = false
  }
}

const totalSpent = computed(() =>
  selectedOrders.value
    .filter((o) => !['CANCELLED', 'PENDING_PAYMENT'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0),
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-bold text-slate-900">Clientes</h2>
      <p class="text-sm text-slate-500">{{ customers.length }} clientes registrados</p>
    </div>

    <div class="relative max-w-sm">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input v-model="search" class="input-base !pl-9" placeholder="Buscar cliente..." />
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="space-y-3 p-6">
        <BaseSkeleton v-for="i in 6" :key="i" class="h-14" />
      </div>
      <div v-else-if="filtered.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Cliente</th>
              <th class="px-4 py-3">Contacto</th>
              <th class="px-4 py-3">Registro</th>
              <th class="px-4 py-3 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="customer in filtered"
              :key="customer.id"
              class="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/50"
              @click="openDetail(customer)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600">
                    {{ customer.firstName?.[0] }}{{ customer.lastName?.[0] }}
                  </span>
                  <div>
                    <p class="font-semibold text-slate-800">{{ customer.firstName }} {{ customer.lastName }}</p>
                    <p class="text-xs text-slate-400">{{ customer.id.slice(0, 8) }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <p class="flex items-center gap-1.5 text-slate-600"><Mail class="h-3.5 w-3.5 text-slate-300" /> {{ customer.email }}</p>
                <p v-if="customer.phone" class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone class="h-3 w-3 text-slate-300" /> {{ customer.phone }}
                </p>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ date(customer.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <ChevronRight class="ml-auto h-4 w-4 text-slate-300" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else icon="inbox" title="No hay clientes" description="Aún no hay clientes registrados." />
    </div>

    <BaseModal :open="!!selected" :title="selected ? `${selected.firstName} ${selected.lastName}` : ''" size="lg" @close="selected = null">
      <div v-if="detailLoading" class="space-y-3">
        <BaseSkeleton v-for="i in 4" :key="i" class="h-16" />
      </div>
      <template v-else-if="selected">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs text-slate-400">Email</p>
            <p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Mail class="h-3.5 w-3.5" /> {{ selected.email }}
            </p>
          </div>
          <div class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs text-slate-400">Teléfono</p>
            <p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Phone class="h-3.5 w-3.5" /> {{ selected.phone || '—' }}
            </p>
          </div>
          <div class="rounded-lg bg-slate-50 p-4">
            <p class="text-xs text-slate-400">Registro</p>
            <p class="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <CalendarDays class="h-3.5 w-3.5" /> {{ date(selected.createdAt) }}
            </p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center">
            <p class="text-2xl font-extrabold text-brand-700">{{ selectedOrders.length }}</p>
            <p class="text-xs font-medium text-brand-800">Compras</p>
          </div>
          <div class="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <p class="text-2xl font-extrabold text-emerald-700">{{ currency(totalSpent) }}</p>
            <p class="text-xs font-medium text-emerald-800">Total gastado</p>
          </div>
        </div>

        <h3 class="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Pedidos</h3>
        <div v-if="selectedOrders.length" class="space-y-2">
          <div
            v-for="order in selectedOrders"
            :key="order.id"
            class="flex items-center justify-between rounded-lg border border-slate-100 p-3"
          >
            <div>
              <p class="font-bold text-slate-800">{{ order.orderNumber }}</p>
              <p class="text-xs text-slate-400">{{ date(order.createdAt) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <p class="font-bold text-slate-900">{{ currency(order.total) }}</p>
              <StatusBadge :label="order.status" :status="order.status" />
            </div>
          </div>
        </div>
        <p v-else class="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
          Este cliente aún no realizó compras.
        </p>
      </template>
    </BaseModal>
  </div>
</template>