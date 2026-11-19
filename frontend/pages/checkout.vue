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
  ExternalLink,
  Package,
} from 'lucide-vue-next'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { ordersService, shipmentsService } from '~/services'
import { useFormat } from '~/composables/useFormat'
import { useApi } from '~/composables/useApi'
import type { ShippingOption } from '~/types'

const router = useRouter()
const cart = useCartStore()
const auth = useAuthStore()
const { currency } = useFormat()
const toast = useToast()
const { api } = useApi()

const step = ref(1)
const processing = ref(false)
const error = ref('')
const redirectingToMp = ref(false)

// ── Cotización de envío ───────────────────────────────────────────────
/** Opciones de envío reales cotizadas por Envia.com (carrier + servicio + precio). */
const shippingOptions = ref<ShippingOption[]>([])
const selectedOptionId = ref<string | null>(null)
const quotingShipping = ref(false)
const quoteError = ref('')

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
  /** Única modalidad: entrega a domicilio. */
  shippingMethod: 'HOME_DELIVERY' as 'HOME_DELIVERY',
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

// ── Opciones de envío ─────────────────────────────────────────────────
/**
 * Opciones de envío con entrega a domicilio. El paquete sale desde la sucursal
 * de Envia más cercana al local y el carrier lo lleva hasta la casa del
 * comprador: nunca hay retiro en sucursal ni retiro en TOROX.
 */
const homeOptions = computed(() => shippingOptions.value.filter((o) => o.deliveryMode === 'HOME'))
/** Opción elegida por el comprador. */
const selectedOption = computed(
  () => shippingOptions.value.find((o) => o.id === selectedOptionId.value) ?? null,
)

const shippingCost = computed(() => selectedOption.value?.cost ?? 0)

// El envío recién se conoce cuando cotiza Envia con la dirección ingresada.
const shippingPending = computed(() => selectedOption.value === null)

const shippingLabel = computed(() => {
  if (shippingPending.value) return 'A cotizar'
  return shippingCost.value === 0 ? 'Gratis' : currency(shippingCost.value)
})

/** Descripción corta de la opción elegida, para el resumen lateral. */
const shippingSummary = computed(() => {
  if (!selectedOption.value) return ''
  const eta = selectedOption.value.deliveryEstimate
    ? ` · ${selectedOption.value.deliveryEstimate}`
    : ''
  return `${selectedOption.value.carrierName} — Entrega a domicilio${eta}`
})

// Mismo cálculo que hace el backend al crear la orden:
// subtotal − descuentos + envío cotizado.
const displayTotal = computed(() => {
  const subtotal = cart.cart?.subtotal || 0
  const discount = cart.cart?.discount || 0
  return Math.max(0, subtotal - discount + shippingCost.value)
})

// Cotiza el envío cuando el usuario completa CP y provincia en el paso 2
async function fetchShippingQuote() {
  shippingOptions.value = []
  selectedOptionId.value = null
  if (!form.postalCode || !form.province || !cart.cart?.items?.length) return

  quotingShipping.value = true
  quoteError.value = ''
  try {
    const result = await shipmentsService.quote({
      province: form.province,
      city: form.city.trim() || undefined,
      postalCode: form.postalCode,
      address: form.address.trim() || undefined,
      number: form.number.trim() || undefined,
      items: cart.cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })
    shippingOptions.value = result.options ?? []
    // Por defecto queda preseleccionada la opción más barata.
    selectOption(shippingOptions.value[0]?.id ?? null)
  } catch (err: any) {
    quoteError.value = err?.message || 'No se pudo cotizar el envío con Envia.com.'
    shippingOptions.value = []
    selectedOptionId.value = null
  } finally {
    quotingShipping.value = false
  }
}

/** Selecciona una opción de envío (siempre con entrega a domicilio). */
function selectOption(optionId: string | null) {
  selectedOptionId.value = optionId
  const option = shippingOptions.value.find((o) => o.id === optionId)
  if (!option) return
  form.shippingMethod = 'HOME_DELIVERY'
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
    if (!form.city || !form.postalCode || !form.address || !form.number) {
      error.value = 'Completá todos los campos de la dirección de envío.'
      return false
    }
    // Cotizar envío al pasar al paso 3
    fetchShippingQuote()
  }
  if (current === 3) {
    if (!selectedOption.value) {
      error.value = 'Elegí una opción de envío.'
      return false
    }
  }
  if (current === 4) {
    // Paso 4: pago con MercadoPago Checkout Pro. No se requiere validar tarjeta
    // en el frontend; MercadoPago se encarga del pago.
  }
  return true
}

function next() {
  if (!validateStep(step.value)) return
  if (step.value < 4) {
    step.value += 1
  } else {
    placeOrderWithMercadoPago()
  }
}

function back() {
  if (step.value > 1) step.value -= 1
}

async function placeOrderWithMercadoPago() {
  processing.value = true
  error.value = ''
  redirectingToMp.value = false
  
  try {
    // First, create the order via API
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
      shippingOptionId: selectedOption.value?.id,
      cartSessionId: auth.isAuthenticated ? undefined : cart.session(),
    })

    // Keep a copy for guests so the confirmation page can render.
    if (!auth.isAuthenticated && import.meta.client) {
      sessionStorage.setItem('torox_last_order', JSON.stringify(order))
    }
    await cart.refresh()

    // Now create the MercadoPago preference
    const mpResult = await api<{ preferenceId: number; initPoint: string }>(
      '/payments/mercadopago/create-preference',
      {
        method: 'POST',
        body: {
          orderId: order.id,
          customerEmail: form.customerEmail.trim(),
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          shippingAddress: {
            province: form.province,
            city: form.city.trim(),
            postalCode: form.postalCode.trim(),
            address: form.address.trim(),
            number: form.number.trim(),
          },
        },
      }
    )

    // Redirect to MercadoPago checkout
    window.location.href = mpResult.initPoint
    redirectingToMp.value = true
  } catch (err: any) {
    error.value = err.message || 'No se pudo iniciar el pago. Intentalo de nuevo.'
    toast.error(error.value)
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="container-torox py-8 w-full overflow-x-hidden">
    <h1 class="font-display mb-8 text-[2.1rem] text-slate-900 sm:text-5xl">Finalizar <span class="text-gradient-torox">compra</span></h1>

    <!-- Steps -->
    <ol class="mb-10 flex w-full min-w-0 items-center gap-0">
      <li v-for="(s, index) in steps" :key="s.number" class="flex flex-1 items-center last:flex-none">
        <div class="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition"
            :class="step > s.number
              ? 'bg-brass-500 text-[#0d0e10]'
              : step === s.number
                ? 'bg-torox text-white ring-4 ring-torox/20'
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
          :class="step > s.number ? 'bg-brass-500' : 'bg-slate-200'" />
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

        <div v-if="step === 3" class="card animate-fade-in-up p-6">
          <div class="label-brass mb-2 flex items-center gap-2">
            <Truck class="h-4 w-4" /> Envío por <a href='https://www.envia.com/' target="_blank"
              class="underline">Envia.com</a>
          </div>
          <h2 class="mb-5 text-lg font-bold text-slate-900">Método de envío</h2>

          <!-- Única modalidad: entrega a domicilio -->
          <div class="mb-3 flex items-start gap-4 rounded-xl border-2 border-brand-500 bg-brand-50/50 p-4">
            <Home class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span class="flex-1">
              <span class="flex items-center gap-2 font-semibold text-slate-800">
                Entrega a domicilio con Envia.com
              </span>
            </span>
          </div>

          <div class="mt-4 space-y-4">
            <div v-if="quotingShipping" class="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 class="h-4 w-4 animate-spin" /> Calculando las opciones de envío...
            </div>

            <div v-else-if="quoteError" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {{ quoteError }}
            </div>

            <div v-else-if="!shippingOptions.length" class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Completá tu dirección para ver las opciones de envío disponibles.
            </div>

            <template v-else>
              <!-- Entrega a domicilio -->
              <div v-if="homeOptions.length">
                <p class="label-brass mb-2 flex items-center gap-2">
                  <Home class="h-3.5 w-3.5" /> Entrega a domicilio
                </p>
                <div class="space-y-2">
                  <label v-for="option in homeOptions" :key="option.id"
                    class="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition"
                    :class="selectedOptionId === option.id ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'">
                    <input :checked="selectedOptionId === option.id" type="radio" name="shipping-option"
                      class="mt-1 h-4 w-4 text-brand-600" @change="selectOption(option.id)" />
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center justify-between gap-2">
                        <span class="font-semibold text-slate-800">{{ option.carrierName }}</span>
                        <span class="font-bold text-slate-900">{{ currency(option.cost) }}</span>
                      </span>
                      <span v-if="option.deliveryEstimate || option.serviceDescription" class="mt-0.5 block text-xs text-slate-500">
                        {{ option.serviceDescription || option.service }}<template v-if="option.deliveryEstimate"> · Llega en {{ option.deliveryEstimate }}</template>
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <p v-else class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Por el momento no hay entregas a domicilio disponibles para esta dirección.
              </p>
            </template>
          </div>
        </div>

        <!-- Step 4: Payment -->
        <div v-if="step === 4" class="card animate-fade-in-up p-6">
          <div class="label-brass mb-2 flex items-center gap-2">
            <CreditCard class="h-4 w-4" /> Mercado Pago Checkout Pro
          </div>
          <h2 class="mb-5 text-lg font-bold text-slate-900">Pagar con Mercado Pago</h2>

          <div v-if="!redirectingToMp" class="space-y-6">
            <p class="text-slate-600">
              Al confirmar, serás redirigido al checkout de Mercado Pago para completar tu pago de forma segura.
              Todos los métodos de pago aceptados por Mercado Pago están disponibles.
            </p>

            <div class="flex flex-col gap-3">
              <button
                class="btn-primary gap-3 !px-8 !py-4 !text-base"
                :disabled="processing"
                @click="next"
              >
                <ExternalLink class="h-5 w-5" />
                {{ processing ? 'Redirigiendo...' : 'Pagar con Mercado Pago' }}
              </button>

              <p class="text-xs text-slate-500">
                🔒 Pago seguro procesado por Mercado Pago. No almacenamos datos de tarjetas.
              </p>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-start gap-3">
                <Package class="mt-0.5 h-5 w-5 text-slate-400" />
                <div class="text-xs text-slate-600">
                  <p class="font-medium">Información del pedido</p>
                  <p class="mt-1">
                    {{ cart.cart?.items?.length }} artículo{{ cart.cart?.items?.length === 1 ? '' : 's' }} — Total: {{ currency(displayTotal) }}
                  </p>
                  <p class="mt-1">
                    El envío será gestionado por <a href='https://www.envia.com/' target="_blank" class="underline">Envia.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <Loader2 class="mx-auto h-12 w-12 animate-spin text-brand-600" />
            <p class="mt-4 text-lg font-medium text-slate-600">Redirigiendo al pago...</p>
            <p class="mt-1 text-sm text-slate-500">No cierres esta ventana</p>
          </div>
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
              <p v-if="item.productSnapshot?.variantName" class="text-xs text-slate-500">
                {{ item.productSnapshot.variantName }}
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
            <span class="font-semibold" :class="shippingPending ? 'text-slate-500' : shippingCost === 0 ? 'text-emerald-600' : 'text-slate-900'">
              {{ shippingLabel }}
            </span>
          </div>
          <p v-if="shippingSummary" class="text-xs text-slate-400">{{ shippingSummary }}</p>
          <div class="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
            <span>Total a pagar</span>
            <span>{{ currency(displayTotal) }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>