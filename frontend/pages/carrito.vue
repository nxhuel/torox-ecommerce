<script setup lang="ts">
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft, Truck } from 'lucide-vue-next'
import { useCartStore } from '~/stores/cart'
import { useFormat } from '~/composables/useFormat'

const cart = useCartStore()
const { currency } = useFormat()
const router = useRouter()

onMounted(() => cart.init())

async function update(itemId: string, quantity: number) {
  if (quantity <= 0) {
    await cart.remove(itemId)
  } else {
    await cart.update(itemId, quantity)
  }
}

async function removeItem(itemId: string) {
  await cart.remove(itemId)
}

function productLink(item: any) {
  return `/especificacion/${item.productSnapshot?.slug || item.productId}`
}

function productName(item: any) {
  return item.productSnapshot?.name || 'Producto'
}

function productImage(item: any) {
  return item.productSnapshot?.image || null
}
</script>

<template>
  <div class="container-torox py-8 overflow-x-hidden">
    <h1 class="mb-8 text-2xl font-bold text-slate-900 sm:text-3xl">Mi carrito</h1>

    <div v-if="cart.loading" class="space-y-4">
      <BaseSkeleton v-for="i in 3" :key="i" class="h-28 !rounded-xl" />
    </div>

    <template v-else-if="cart.cart && cart.cart.items.length">
      <!-- grid-cols-1 clamps the mobile column to the viewport (an implicit `auto`
           track would grow with long product names and clip the whole page). -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <!-- Items -->
        <div class="min-w-0 space-y-4">
          <div
            v-for="item in cart.cart.items"
            :key="item.id"
            class="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card"
          >
            <NuxtLink :to="productLink(item)" class="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              <AppImage :src="productImage(item)" :alt="productName(item)" :seed="item.productId" class="h-full w-full" />
            </NuxtLink>
            <div class="flex min-w-0 flex-1 flex-col overflow-x-hidden">
              <div class="flex items-start justify-between gap-3">
                <NuxtLink :to="productLink(item)" class="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-brand-700">
                  {{ productName(item) }}
                </NuxtLink>
                <button class="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Eliminar" @click="removeItem(item.id)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
              <p class="mt-1 text-xs text-slate-400">
                {{ item.productSnapshot?.brand || 'TOROX' }} • SKU: {{ item.productId.slice(0, 8).toUpperCase() }}
              </p>
              <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <QuantitySelector :model-value="item.quantity" :max="item.productSnapshot?.stock || 99" @update:model-value="update(item.id, $event)" />
                <div class="text-right">
                  <p class="text-lg font-bold text-slate-900">{{ currency(item.unitPrice * item.quantity) }}</p>
                  <p v-if="item.quantity > 1" class="text-xs text-slate-400">{{ currency(item.unitPrice) }} c/u</p>
                </div>
              </div>
            </div>
          </div>

          <NuxtLink to="/productos" class="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
            <ArrowLeft class="h-4 w-4" /> Seguir comprando
          </NuxtLink>
        </div>

        <!-- Summary -->
        <aside class="h-fit min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-card lg:sticky lg:top-24">
          <h2 class="text-lg font-bold text-slate-900">Resumen de compra</h2>
          <div class="mt-4 space-y-2.5 text-sm">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span class="font-semibold text-slate-900">{{ currency(cart.cart.subtotal) }}</span>
            </div>
            <div v-if="cart.cart.discount > 0" class="flex justify-between text-emerald-600">
              <span>Descuentos</span>
              <span class="font-semibold">-{{ currency(cart.cart.discount) }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Envío</span>
              <span class="font-semibold" :class="cart.cart.shippingCost === 0 ? 'text-emerald-600' : 'text-slate-900'">
                {{ cart.cart.shippingCost === 0 ? 'Gratis' : currency(cart.cart.shippingCost) }}
              </span>
            </div>
            <div class="border-t border-slate-100 pt-3">
              <div class="flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{{ currency(cart.cart.total) }}</span>
              </div>
            </div>
          </div>

          <!-- <div v-if="cart.cart.subtotal < cart.cart.freeShippingThreshold" class="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
            <Truck class="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Te faltan {{ currency(cart.cart.freeShippingThreshold - cart.cart.subtotal) }} para envío gratis
            </span>
          </div> -->

          <button class="btn-primary mt-5 w-full !py-3" @click="router.push('/checkout')">
            Continuar compra <ArrowRight class="h-4 w-4" />
          </button>
          <p class="mt-3 text-center text-xs text-slate-400">
            Comprá sin registrarte o con tu cuenta
          </p>
        </aside>
      </div>
    </template>

    <EmptyState
      v-else
      icon="cart"
      title="Tu carrito está vacío"
      description="Explorá nuestro catálogo de productos de seguridad y encontrá lo que necesitás."
    >
      <NuxtLink to="/productos" class="btn-primary">
        <ShoppingCart class="h-4 w-4" /> Ver productos
      </NuxtLink>
    </EmptyState>
  </div>
</template>