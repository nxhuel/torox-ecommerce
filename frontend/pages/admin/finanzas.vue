<script setup lang="ts">
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-vue-next'
import type { FinanceMovement } from '~/types'
import { financeService } from '~/services'
import { MOVEMENT_CATEGORY_LABELS, useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { currency, date } = useFormat()
const toast = useToast()

const movements = ref<FinanceMovement[]>([])
const summary = ref<any>(null)
const monthly = ref<{ label: string; income: number; expense: number }[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const typeFilter = ref('')
const limit = 12

const showExpenseModal = ref(false)
const saving = ref(false)
const expenseForm = reactive({
  category: 'MERCHANDISE',
  description: '',
  amount: 0,
  date: '',
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [m, s, monthlyData] = await Promise.all([
      financeService.movements({ page: page.value, limit, type: typeFilter.value || undefined }),
      financeService.summary(),
      financeService.monthly(6),
    ])
    movements.value = m.items
    totalPages.value = m.meta?.totalPages || 1
    summary.value = s
    monthly.value = monthlyData
  } finally {
    loading.value = false
  }
}

function changeType() {
  page.value = 1
  load()
}

async function saveExpense() {
  if (!expenseForm.description || expenseForm.amount <= 0) {
    toast.error('Completá la descripción y un monto válido')
    return
  }
  saving.value = true
  try {
    await financeService.recordExpense({
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      date: expenseForm.date || undefined,
    })
    toast.success('Gasto registrado')
    showExpenseModal.value = false
    expenseForm.description = ''
    expenseForm.amount = 0
    expenseForm.date = ''
    await load()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

const categoryColors: Record<string, string> = {
  SALE: 'bg-emerald-50 text-emerald-700',
  MERCHANDISE: 'bg-blue-50 text-blue-700',
  LOGISTICS: 'bg-indigo-50 text-indigo-700',
  ADVERTISING: 'bg-pink-50 text-pink-700',
  SALARY: 'bg-amber-50 text-amber-700',
  OTHER: 'bg-slate-100 text-slate-600',
}

function categoryLabel(movement: FinanceMovement) {
  return MOVEMENT_CATEGORY_LABELS[movement.category] || movement.category
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Finanzas</h2>
        <p class="text-sm text-slate-500">Libro contable simplificado</p>
      </div>
      <button class="btn-primary" @click="showExpenseModal = true">
        <Plus class="h-4 w-4" /> Registrar gasto
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <BaseSkeleton v-for="i in 4" :key="i" class="h-28 !rounded-xl" />
    </div>

    <div v-else-if="summary" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Ingresos totales</p>
            <p class="mt-2 text-2xl font-extrabold text-emerald-600">{{ currency(summary.totalIncome) }}</p>
          </div>
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp class="h-5.5 w-5.5" />
          </span>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Gastos totales</p>
            <p class="mt-2 text-2xl font-extrabold text-red-600">{{ currency(summary.totalExpense) }}</p>
          </div>
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <TrendingDown class="h-5.5 w-5.5" />
          </span>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Ganancia</p>
            <p class="mt-2 text-2xl font-extrabold" :class="summary.profit >= 0 ? 'text-slate-900' : 'text-red-600'">
              {{ currency(summary.profit) }}
            </p>
          </div>
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Wallet class="h-5.5 w-5.5" />
          </span>
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Del mes</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ currency(summary.monthProfit) }}</p>
            <p class="mt-0.5 text-xs text-slate-400">{{ currency(summary.monthIncome) }} ingresos / {{ currency(summary.monthExpense) }} gastos</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly chart -->
    <div v-if="!loading && monthly.length" class="card p-6">
      <h3 class="mb-6 font-bold text-slate-900">Ingresos y gastos por mes</h3>
      <div class="flex h-52 items-end gap-3">
        <div v-for="item in monthly" :key="item.label" class="flex flex-1 flex-col items-center gap-2">
          <div class="flex w-full items-end justify-center gap-1">
            <div class="w-1/3 rounded-t bg-emerald-500 transition-all" :style="{ height: `${Math.max(2, (item.income / Math.max(1, ...monthly.map((m) => m.income))) * 100)}%` }" />
            <div class="w-1/3 rounded-t bg-red-400 transition-all" :style="{ height: `${Math.max(2, (item.expense / Math.max(1, ...monthly.map((m) => m.income))) * 100)}%` }" />
          </div>
          <span class="text-[11px] font-medium text-slate-500">{{ item.label }}</span>
        </div>
      </div>
      <div class="mt-3 flex justify-center gap-5 text-xs text-slate-500">
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ingresos</span>
        <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-red-400" /> Gastos</span>
      </div>
    </div>

    <!-- Movements -->
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-slate-900">Movimientos</h3>
      <select v-model="typeFilter" class="input-base !w-auto !py-1.5" @change="changeType">
        <option value="">Todos</option>
        <option value="INCOME">Ingresos</option>
        <option value="EXPENSE">Gastos</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="space-y-3 p-6">
        <BaseSkeleton v-for="i in 6" :key="i" class="h-12" />
      </div>
      <div v-else-if="movements.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3">Descripción</th>
              <th class="px-4 py-3">Categoría</th>
              <th class="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movement in movements" :key="movement.id" class="border-b border-slate-50">
              <td class="px-4 py-3 text-slate-600">{{ date(movement.date) }}</td>
              <td class="px-4 py-3 font-medium text-slate-800">{{ movement.description }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="categoryColors[movement.category]">
                  {{ categoryLabel(movement) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="flex items-center justify-end gap-1.5 font-bold" :class="movement.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'">
                  <ArrowDownToLine v-if="movement.type === 'INCOME'" class="h-4 w-4" />
                  <ArrowUpFromLine v-else class="h-4 w-4" />
                  {{ movement.type === 'INCOME' ? '+' : '-' }}{{ currency(movement.amount) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else icon="inbox" title="Sin movimientos" description="No hay movimientos financieros todavía." />
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

    <!-- Expense modal -->
    <BaseModal :open="showExpenseModal" title="Registrar gasto" @close="showExpenseModal = false">
      <div class="grid gap-4">
        <div>
          <label class="label-base">Categoría</label>
          <select v-model="expenseForm.category" class="input-base">
            <option value="MERCHANDISE">Compra de mercadería</option>
            <option value="LOGISTICS">Logística</option>
            <option value="ADVERTISING">Publicidad</option>
            <option value="SALARY">Sueldos</option>
            <option value="OTHER">Otros</option>
          </select>
        </div>
        <div>
          <label class="label-base">Descripción *</label>
          <input v-model="expenseForm.description" class="input-base" placeholder="Compra de mercadería — Hikvision" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label-base">Monto *</label>
            <input v-model.number="expenseForm.amount" type="number" min="0" class="input-base" />
          </div>
          <div>
            <label class="label-base">Fecha</label>
            <input v-model="expenseForm.date" type="date" class="input-base" />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showExpenseModal = false">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="saveExpense">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" />
          Registrar
        </button>
      </template>
    </BaseModal>
  </div>
</template>