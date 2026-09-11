<script setup lang="ts">
import {
  User,
  MapPin,
  Truck,
  CreditCard,
  Check,
  Shield,
  Loader2,
  Building,
  Home,
  Landmark,
} from 'lucide-vue-next'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { ordersService } from '~/services'
import { useFormat } from '~/composables/useFormat'

const router = useRouter()
const cart = useCartStore()
const auth = useAuthStore()
const { currency } = useFormat()
const toast = useToast()

const step = ref(1)
const processing = ref(false)
const error = ref('')

const form = reactive({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  province: 'Buenos Aires',
  city: '',
  postalCode: '',
  address: '',
  number: '',
  apartment: '',
  references: '',
  shippingMethod: 'HOME_DELIVERY' as 'HOME_DELIVERY' | 'PICKUP',
  paymentMethod: 'CREDIT_CARD' as 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER',
  cardNumber: '',
  cardHolder: '',
  cardExpiry: '',
  cardCvc: '',
})

const provinces = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
]

onMounted(async () => {
  auth.init()
  await cart.init()
  if (!cart.cart?.items.length) {
    router.replace('/carrito')
    return
  }
  if (auth.isAuthenticated && auth.user) {
    form.customerName = `${auth.user.firstName} ${auth.user.lastName}`.trim()
    form.customerEmail = auth.user.email
    form.customerPhone = auth.user.phone || ''
  }
})

const steps = [
  { number: 1, label: 'Datos personales', icon: User },
  { number: 2, label: 'Dirección', icon: MapPin },
  { number: 3, label: 'Envío', icon: Truck },
  { number: 4, label: 'Pago', icon: CreditCard },
]

const cardBrand = computed(() => {
  const digits = form.cardNumber.replace(/\D/g, '')
  if (/^(34|37)/.test(digits)) return { name: 'American Express', short: 'AMEX', color: 'bg-blue-700' }
  if (/^5[1-5]/.test(digits)) return { name: 'Mastercard', short: 'MC', color: 'bg-orange-600' }
  if (/^4/.test(digits)) return { name: 'Visa', short: 'VISA', color: 'bg-blue-500' }
  if (/^(60|62)/.test(digits)) return { name: 'Cabal', short: 'CABAL', color: 'bg-purple-600' }
  if (/^6/.test(digits)) return { name: 'Maestro', short: 'MAESTRO', color: 'bg-red-500' }
  return null
})

const freeShipping = computed(() => {
  const subtotal = cart.cart?.subtotal || 0
  return subtotal >= (cart.cart?.freeShippingThreshold || 50000)
})

const shippingCost = computed(() => {
  if (!cart.cart) return 0
  if (form.shippingMethod === 'PICKUP' || freeShipping.value) return 0
  return cart.cart.shippingCost
})

// El total lo calcula el backend: subtotal + shippingCost (el descuento ya está aplicado en el subtotal)
const total = computed(() => (cart.cart?.total || 0))

function formatCardNumber() {
  const digits = form.cardNumber.replace(/\D/g, '').slice(0, 16)
  form.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry() {
  let digits = form.cardExpiry.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) {
    digits = `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  form.cardExpiry = digits
}

function validateStep(current: number): boolean {
  error.value = ''
  if (current === 1) {
    if (!form.customerName.trim() || !form.customerEmail.trim() || !form.customerPhone.trim()) {
      error.value = 'Completá todos los campos de datos personales.'
      return false
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customerEmail)) {
      error.value = 'Ingresá un email válido.'
      return false
    }
  }
  if (current === 2) {
    if (form.shippingMethod === 'HOME_DELIVERY') {
      if (!form.city || !form.postalCode || !form.address || !form.number) {
        error.value = 'Completá todos los campos de la dirección de envío.'
        return false
      }
    }
  }
  if (current === 4) {
    if (form.paymentMethod !== 'BANK_TRANSFER') {
      if (form.cardNumber.replace(/\D/g, '').length < 12) {
        error.value = 'El número de tarjeta es inválido.'
        return false
      }
      if (!form.cardHolder.trim()) {
        error.value = 'Ingresá el titular de la tarjeta.'
        return false
      }
      if (form.cardExpiry.replace(/\D/g, '').length !== 4) {
        error.value = 'Ingresá la fecha de vencimiento.'
        return false
      }
      if (form.cardCvc.length < 3) {
        error.value = 'Ingresá el código de seguridad.'
        return false
      }
    }
  }
  return true
}

function next() {
  if (!validateStep(step.value)) return
  if (step.value < 4) {
    step.value += 1
  } else {
    placeOrder()
  }
}

function back() {
  if (step.value > 1) step.value -= 1
}

async function placeOrder() {
  processing.value = true
  error.value = ''
  try {
    const order = await ordersService.create({
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim(),
      customerPhone: form.customerPhone.trim(),
      shippingAddress: {
        province: form.province,
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        address: form.address.trim(),
        number: form.number.trim(),
        apartment: form.apartment.trim() || undefined,
        references: form.references.trim() || undefined,
      },
      shippingMethod: form.shippingMethod,
      payment: {
        method: form.paymentMethod,
        cardNumber: form.cardNumber.replace(/\s/g, ''),
        cardHolder: form.cardHolder,
        cardExpiry: form.cardExpiry,
        cardCvc: form.cardCvc,
      },
      cartSessionId: auth.isAuthenticated ? undefined : cart.session(),
    })

    // Keep a copy for guests so the confirmation page can render.
    if (!auth.isAuthenticated && import.meta.client) {
      sessionStorage.setItem('torox_last_order', JSON.stringify(order))
    }
    await cart.refresh()
    router.push(`/pedidos/${order.id}`)
  } catch (err: any) {
    error.value = err.message || 'No se pudo procesar el pedido. Intentalo de nuevo.'
    toast.error(error.value)
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="container-torox py-8 w-full overflow-x-hidden">
    <h1 class="mb-8 text-2xl font-bold text-slate-900 sm:text-3xl">Finalizar compra</h1>

    <!-- Steps -->
    <ol class="mb-10 flex w-full min-w-0 items-center gap-0">
      <li v-for="(s, index) in steps" :key="s.number" class="flex flex-1 items-center last:flex-none">
        <div class="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition"
            :class="step > s.number
              ? 'bg-emerald-500 text-white'
              : step === s.number
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-slate-200 text-slate-500'
              ">
            <Check v-if="step > s.number" class="h-4 w-4" />
            <span v-else>{{ s.number }}</span>
          </span>
          <span class="hidden text-sm font-semibold sm:block"
            :class="step >= s.number ? 'text-slate-900' : 'text-slate-400'">
            {{ s.label }}
          </span>
        </div>
        <div v-if="index < steps.length - 1" class="mx-2 h-0.5 flex-1 rounded sm:mx-3"
          :class="step > s.number ? 'bg-emerald-500' : 'bg-slate-200'" />
      </li>
    </ol>

    <!-- grid-cols-1 keeps the mobile column clamped to the viewport (an implicit
         `auto` track would grow past it with long product names, clipping everything). -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div class="min-w-0 space-y-6">
        <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <!-- Step 1: Personal data -->
        <div v-if="step === 1" class="card animate-fade-in-up p-6">
          <h2 class="mb-5 text-lg font-bold text-slate-900">Datos personales</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="label-base" for="customerName">Nombre y apellido *</label>
              <input id="customerName" v-model="form.customerName" class="input-base" placeholder="Juan Pérez" />
            </div>
            <div>
              <label class="label-base" for="customerEmail">Email *</label>
              <input id="customerEmail" v-model="form.customerEmail" type="email" class="input-base"
                placeholder="juan@email.com" />
            </div>
            <div>
              <label class="label-base" for="customerPhone">Teléfono *</label>
              <input id="customerPhone" v-model="form.customerPhone" class="input-base"
                placeholder="+54 11 5555-1234" />
            </div>
          </div>

          <div v-if="!auth.isAuthenticated"
            class="mt-5 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
            <p>
              <strong>¿Ya tenés una cuenta?</strong>
              <NuxtLink to="/auth/login" class="font-bold underline">Ingresá</NuxtLink>
              para guardar tus compras y recibir ofertas. Si no, podés continuar como invitado.
            </p>
          </div>
        </div>

        <!-- Step 2: Address -->
        <div v-if="step === 2" class="card animate-fade-in-up p-6">
          <h2 class="mb-5 text-lg font-bold text-slate-900">Dirección de envío</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label-base" for="province">Provincia *</label>
              <select id="province" v-model="form.province" class="input-base">
                <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div>
              <label class="label-base" for="city">Ciudad *</label>
              <input id="city" v-model="form.city" class="input-base" placeholder="Ciudad" />
            </div>
            <div>
              <label class="label-base" for="postalCode">Código postal *</label>
              <input id="postalCode" v-model="form.postalCode" class="input-base" placeholder="1900" />
            </div>
            <div class="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
              <div class="min-w-0">
                <label class="label-base" for="address">Dirección *</label>
                <input id="address" v-model="form.address" class="input-base w-full" placeholder="Calle" />
              </div>
              <div>
                <label class="label-base" for="number">Nro. *</label>
                <input id="number" v-model="form.number" class="input-base" placeholder="123" />
              </div>
            </div>
            <div>
              <label class="label-base" for="apartment">Departamento / Piso</label>
              <input id="apartment" v-model="form.apartment" class="input-base" placeholder="2°B (opcional)" />
            </div>
            <div>
              <label class="label-base" for="references">Referencias</label>
              <input id="references" v-model="form.references" class="input-base"
                placeholder="Casa con reja negra (opcional)" />
            </div>
          </div>
        </div>

        <!-- Step 3: Shipping method -->
        <div v-if="step === 3" class="card animate-fade-in-up p-6">
          <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Truck class="h-4 w-4" /> Envío por <a href='https://www.andreani.com/' target="_blank"
              class="underline ">Andreani</a>
          </div>
          <h2 class="mb-5 text-lg font-bold text-slate-900">Método de envío</h2>
          <div class="space-y-3">
            <label class="flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition"
              :class="form.shippingMethod === 'HOME_DELIVERY' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'">
              <input v-model="form.shippingMethod" type="radio" value="HOME_DELIVERY"
                class="mt-1 h-4 w-4 text-brand-600" />
              <span class="flex-1">
                <span class="flex items-center gap-2 font-semibold text-slate-800">
                  <Home class="h-4 w-4 text-brand-600" /> Envío a domicilio
                </span>
              </span>
            </label>
          </div>
        </div>

        <!-- Step 4: Payment -->
        <div v-if="step === 4" class="card animate-fade-in-up p-6">
          <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CreditCard class="h-4 w-4" /> Pago simulado — Mercado Pago
          </div>
          <h2 class="mb-5 text-lg font-bold text-slate-900">Método de pago</h2>

          <div class="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition"
              :class="form.paymentMethod === 'CREDIT_CARD' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'">
              <input v-model="form.paymentMethod" type="radio" value="CREDIT_CARD" class="h-4 w-4 text-brand-600" />
              <span class="text-sm font-semibold text-slate-800">Tarjeta de crédito</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition"
              :class="form.paymentMethod === 'DEBIT_CARD' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'">
              <input v-model="form.paymentMethod" type="radio" value="DEBIT_CARD" class="h-4 w-4 text-brand-600" />
              <span class="text-sm font-semibold text-slate-800">Tarjeta de débito</span>
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition"
              :class="form.paymentMethod === 'BANK_TRANSFER' ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'">
              <input v-model="form.paymentMethod" type="radio" value="BANK_TRANSFER" class="h-4 w-4 text-brand-600" />
              <span class="text-sm font-semibold text-slate-800">Transferencia</span>
            </label>
          </div>

          <template v-if="form.paymentMethod !== 'BANK_TRANSFER'">
            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="label-base" for="cardNumber">Número de tarjeta *</label>
                <div class="relative">
                  <input id="cardNumber" v-model="form.cardNumber" class="input-base !pr-24 font-mono"
                    placeholder="1234 5678 9012 3456" inputmode="numeric" @input="formatCardNumber" />
                  <span v-if="cardBrand"
                    class="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-black text-white"
                    :class="cardBrand.color">
                    {{ cardBrand.short }}
                  </span>
                </div>
                <p v-if="cardBrand" class="mt-1 text-xs text-slate-500">Tarjeta {{ cardBrand.name }} detectada</p>
              </div>
              <div class="sm:col-span-2">
                <label class="label-base" for="cardHolder">Titular de la tarjeta *</label>
                <input id="cardHolder" v-model="form.cardHolder" class="input-base"
                  placeholder="Como figura en la tarjeta" />
              </div>
              <div>
                <label class="label-base" for="cardExpiry">Vencimiento *</label>
                <input id="cardExpiry" v-model="form.cardExpiry" class="input-base font-mono" placeholder="MM/AA"
                  inputmode="numeric" @input="formatExpiry" />
              </div>
              <div>
                <label class="label-base" for="cardCvc">Código de seguridad *</label>
                <input id="cardCvc" v-model="form.cardCvc" class="input-base font-mono" placeholder="123"
                  inputmode="numeric" maxlength="4" />
              </div>
            </div>

            <div class="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              <p class="font-bold">🎮 Datos para la demo:</p>
              <ul class="mt-1 list-inside list-disc space-y-0.5">
                <li>Tarjeta que termina en <strong>par</strong> → pago aprobado</li>
                <li>Tarjeta con <strong>9999</strong> → pago rechazado</li>
                <li>Cualquier otra → pago pendiente de confirmación</li>
              </ul>
              <p class="mt-1">No se almacenan datos reales de tarjetas. Probá con <strong>4000 0000 0000 0002</strong>.
              </p>
            </div>
          </template>

          <template v-else>
            <div class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div class="flex items-start gap-3">
                <Landmark class="mt-0.5 h-6 w-6 text-brand-600" />
                <div>
                  <p class="font-semibold text-slate-800">Transferencia bancaria simulada</p>
                  <p class="mt-1 text-sm text-slate-600">
                    Al confirmar, te mostraremos los datos de la cuenta para realizar la transferencia.
                    El pedido quedará <strong>pendiente de confirmación</strong> hasta que el administrador apruebe el
                    pago.
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Nav buttons -->
        <div class="flex items-center justify-between gap-3">
          <button v-if="step > 1" class="btn-secondary shrink-0" @click="back">Volver</button>
          <span v-else />
          <button class="btn-primary flex-1 !px-8 !py-3 sm:flex-none" :disabled="processing" @click="next">
            <Loader2 v-if="processing" class="h-4 w-4 animate-spin" />
            <template v-else>
              {{ step < 4 ? 'Continuar' : 'Confirmar pago' }} </template>
          </button>
        </div>
      </div>

      <!-- Summary sidebar -->
      <aside class="h-fit min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-card lg:sticky lg:top-24">
        <h2 class="text-lg font-bold text-slate-900">Tu compra</h2>
        <div class="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          <div v-for="item in cart.cart?.items" :key="item.id" class="flex items-center gap-3">
            <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              <AppImage :src="item.productSnapshot?.image" :alt="item.productSnapshot?.name || ''"
                :seed="item.productId" class="h-full w-full" />
              <span
                class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-dark-800 px-1 text-[10px] font-bold text-white">
                {{ item.quantity }}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-700">
                {{ item.productSnapshot?.name }}
              </p>
              <p class="text-xs text-slate-400">
                {{ currency(item.unitPrice) }} x {{ item.quantity }}
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-slate-900">{{ currency(item.unitPrice * item.quantity) }}</p>
          </div>
        </div>
        <div class="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div class="flex justify-between text-slate-600">
            <span>Subtotal ({{ cart.cart?.items.length }} art{{ cart.cart?.items.length === 1 ? 'ículo' : 'ículos' }})</span>
            <span class="font-semibold text-slate-900">{{ currency(cart.cart?.subtotal || 0) }}</span>
          </div>
          <div v-if="(cart.cart?.discount || 0) > 0" class="flex justify-between text-emerald-600">
            <span>Descuentos aplicados</span>
            <span class="font-semibold">-{{ currency(cart.cart?.discount || 0) }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Envío</span>
            <span class="font-semibold" :class="shippingCost === 0 ? 'text-emerald-600' : 'text-slate-900'">
              {{ shippingCost === 0 ? '$0 (PS)' : currency(shippingCost) }}
            </span>
          </div>
          <div class="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
            <span>Total a pagar</span>
            <span>{{ currency(total) }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>