<script setup lang="ts">
import { MapPin, Plus, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'account', middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()

interface Address {
  id: number
  label: string
  province: string
  city: string
  postalCode: string
  address: string
  number: string
}

const addresses = ref<Address[]>([])
const showForm = ref(false)

const form = reactive({
  label: '',
  province: 'Buenos Aires',
  city: '',
  postalCode: '',
  address: '',
  number: '',
})

const provinces = ['Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Entre Ríos']

onMounted(() => {
  auth.init()
  if (import.meta.client) {
    try {
      addresses.value = JSON.parse(localStorage.getItem('torox_addresses') || '[]')
    } catch {
      addresses.value = []
    }
  }
})

function persist() {
  if (import.meta.client) {
    localStorage.setItem('torox_addresses', JSON.stringify(addresses.value))
  }
}

function addAddress() {
  if (!form.city || !form.postalCode || !form.address || !form.number) {
    toast.error('Completá los campos obligatorios')
    return
  }
  addresses.value.push({
    id: Date.now(),
    label: form.label || 'Dirección principal',
    province: form.province,
    city: form.city,
    postalCode: form.postalCode,
    address: form.address,
    number: form.number,
  })
  persist()
  form.label = ''
  form.city = ''
  form.postalCode = ''
  form.address = ''
  form.number = ''
  showForm.value = false
  toast.success('Dirección guardada')
}

function removeAddress(id: number) {
  addresses.value = addresses.value.filter((a) => a.id !== id)
  persist()
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-slate-900">Mis direcciones</h1>
      <button class="btn-primary !px-4" @click="showForm = !showForm">
        <Plus class="h-4 w-4" /> Nueva dirección
      </button>
    </div>

    <form v-if="showForm" class="card mb-6 p-4 sm:p-6">
      <h2 class="mb-4 text-lg font-bold text-slate-900">Nueva dirección</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label-base" for="label">Etiqueta</label>
          <input id="label" v-model="form.label" class="input-base" placeholder="Casa, Oficina..." />
        </div>
        <div>
          <label class="label-base" for="province">Provincia</label>
          <select id="province" v-model="form.province" class="input-base">
            <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="label-base" for="city">Ciudad *</label>
          <input id="city" v-model="form.city" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="postalCode">Código postal *</label>
          <input id="postalCode" v-model="form.postalCode" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="address">Dirección *</label>
          <input id="address" v-model="form.address" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="number">Número *</label>
          <input id="number" v-model="form.number" class="input-base" />
        </div>
      </div>
      <div class="mt-5 flex justify-end gap-3">
        <button class="btn-secondary" @click="showForm = false">Cancelar</button>
        <button class="btn-primary" @click="addAddress">Guardar</button>
      </div>
    </form>

    <div v-if="addresses.length" class="grid gap-4 sm:grid-cols-2">
      <div v-for="address in addresses" :key="address.id" class="card p-5">
        <div class="flex items-start justify-between">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MapPin class="h-5 w-5" />
          </span>
          <button class="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar" @click="removeAddress(address.id)">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-3 font-bold text-slate-900">{{ address.label }}</p>
        <p class="mt-1 text-sm text-slate-600">
          {{ address.address }} {{ address.number }}, {{ address.city }}
        </p>
        <p class="text-sm text-slate-500">{{ address.province }} (CP {{ address.postalCode }})</p>
      </div>
    </div>

    <EmptyState
      v-else
      icon="map-pin"
      title="No tenés direcciones guardadas"
      description="Guardá tus direcciones para agilizar tus próximas compras."
    >
      <button class="btn-primary" @click="showForm = true">
        <Plus class="h-4 w-4" /> Agregar dirección
      </button>
    </EmptyState>
  </div>
</template>