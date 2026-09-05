<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, Tag, Percent, Truck, BadgePercent, Coins } from 'lucide-vue-next'
import type { Promotion } from '~/types'
import { promotionsService } from '~/services'
import { PROMOTION_TYPE_LABELS, useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { currency, date } = useFormat()
const toast = useToast()
const promotions = ref<Promotion[]>([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref<Promotion | null>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  description: '',
  type: 'PERCENTAGE_DISCOUNT',
  value: 0,
  startDate: '',
  endDate: '',
  isActive: true,
})

const typeIcons: Record<string, Component> = {
  PERCENTAGE_DISCOUNT: Percent,
  FIXED_DISCOUNT: Coins,
  FREE_SHIPPING: Truck,
  SPECIAL_OFFER: BadgePercent,
}

onMounted(load)

async function load() {
  loading.value = true
  try {
    promotions.value = await promotionsService.all()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  Object.assign(form, {
    name: '',
    description: '',
    type: 'PERCENTAGE_DISCOUNT',
    value: 0,
    startDate: today,
    endDate: end,
    isActive: true,
  })
  showModal.value = true
}

function openEdit(promotion: Promotion) {
  editing.value = promotion
  Object.assign(form, {
    name: promotion.name,
    description: promotion.description || '',
    type: promotion.type,
    value: Number(promotion.value),
    startDate: promotion.startDate.slice(0, 10),
    endDate: promotion.endDate.slice(0, 10),
    isActive: promotion.isActive,
  })
  showModal.value = true
}

async function save() {
  if (!form.name || !form.startDate || !form.endDate) {
    toast.error('Completá nombre y fechas')
    return
  }
  saving.value = true
  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description || undefined,
    type: form.type,
    value: Number(form.value),
    startDate: new Date(form.startDate).toISOString(),
    endDate: new Date(form.endDate).toISOString(),
    isActive: form.isActive,
  }
  try {
    if (editing.value) {
      await promotionsService.update(editing.value.id, payload)
      toast.success('Promoción actualizada')
    } else {
      await promotionsService.create(payload)
      toast.success('Promoción creada')
    }
    showModal.value = false
    await load()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function remove(promotion: Promotion) {
  if (!confirm(`¿Eliminar la promoción "${promotion.name}"?`)) return
  try {
    await promotionsService.remove(promotion.id)
    toast.success('Promoción eliminada')
    await load()
  } catch (error: any) {
    toast.error(error.message)
  }
}

function formatValue(promotion: Promotion) {
  if (promotion.type === 'PERCENTAGE_DISCOUNT') return `${promotion.value}%`
  if (promotion.type === 'FREE_SHIPPING') return `desde ${currency(promotion.value)}`
  return currency(promotion.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Promociones y ofertas</h2>
        <p class="text-sm text-slate-500">Descuentos, envío gratis y ofertas especiales</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <Plus class="h-4 w-4" /> Nueva promoción
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseSkeleton v-for="i in 6" :key="i" class="h-40 !rounded-xl" />
    </div>

    <div v-else-if="promotions.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="promotion in promotions"
        :key="promotion.id"
        class="card flex flex-col p-5"
        :class="!promotion.isCurrentlyActive ? 'opacity-70' : ''"
      >
        <div class="flex items-start justify-between">
          <span
            class="flex h-11 w-11 items-center justify-center rounded-xl"
            :class="promotion.isCurrentlyActive ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'"
          >
            <component :is="typeIcons[promotion.type] || Tag" class="h-5.5 w-5.5" />
          </span>
          <div class="flex gap-1">
            <button class="rounded-lg p-1.5 text-slate-400 hover:text-brand-600" aria-label="Editar" @click="openEdit(promotion)">
              <Pencil class="h-4 w-4" />
            </button>
            <button class="rounded-lg p-1.5 text-slate-400 hover:text-red-600" aria-label="Eliminar" @click="remove(promotion)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
        <h3 class="mt-3 font-bold text-slate-900">{{ promotion.name }}</h3>
        <p class="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{{ promotion.description }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">
            {{ PROMOTION_TYPE_LABELS[promotion.type] }}
          </span>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
            {{ formatValue(promotion) }}
          </span>
          <span
            class="rounded-full px-2 py-0.5 font-bold"
            :class="promotion.isCurrentlyActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'"
          >
            {{ promotion.isCurrentlyActive ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
        <p class="mt-2 text-xs text-slate-400">
          {{ date(promotion.startDate) }} — {{ date(promotion.endDate) }}
        </p>
      </div>
    </div>

    <EmptyState v-else icon="tag" title="No hay promociones" description="Creá descuentos y ofertas para tus clientes.">
      <button class="btn-primary" @click="openCreate"><Plus class="h-4 w-4" /> Nueva promoción</button>
    </EmptyState>

    <BaseModal :open="showModal" :title="editing ? 'Editar promoción' : 'Nueva promoción'" @close="showModal = false">
      <div class="grid gap-4">
        <div>
          <label class="label-base">Nombre *</label>
          <input v-model="form.name" class="input-base" placeholder="20% OFF en cámaras" />
        </div>
        <div>
          <label class="label-base">Descripción</label>
          <textarea v-model="form.description" rows="2" class="input-base" />
        </div>
        <div>
          <label class="label-base">Tipo</label>
          <select v-model="form.type" class="input-base">
            <option value="PERCENTAGE_DISCOUNT">Descuento porcentual</option>
            <option value="FIXED_DISCOUNT">Descuento fijo</option>
            <option value="FREE_SHIPPING">Envío gratis (monto mínimo)</option>
            <option value="SPECIAL_OFFER">Oferta especial</option>
          </select>
        </div>
        <div>
          <label class="label-base">{{ form.type === 'PERCENTAGE_DISCOUNT' ? 'Porcentaje' : 'Valor' }}</label>
          <input v-model.number="form.value" type="number" min="0" class="input-base" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label-base">Fecha inicio</label>
            <input v-model="form.startDate" type="date" class="input-base" />
          </div>
          <div>
            <label class="label-base">Fecha fin</label>
            <input v-model="form.endDate" type="date" class="input-base" />
          </div>
        </div>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Promoción activa
        </label>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Tag v-else class="h-4 w-4" />
          {{ editing ? 'Guardar' : 'Crear' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>