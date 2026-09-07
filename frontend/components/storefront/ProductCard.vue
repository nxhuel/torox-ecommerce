<script setup lang="ts">
import { ShoppingCart, Heart, Check } from 'lucide-vue-next'
import type { Product } from '~/types'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useFormat } from '~/composables/useFormat'
import { favoritesService } from '~/services'

const props = defineProps<{
  product: Product
}>()

const auth = useAuthStore()
const cart = useCartStore()
const { currency } = useFormat()
const toast = useToast()
const router = useRouter()

const isFavorite = ref(!!props.product.favoriteId)
const added = ref(false)

const discount = computed(() => {
  if (!props.product.originalPrice || props.product.originalPrice <= props.product.price) return null
  return Math.round(((props.product.originalPrice - props.product.price) / props.product.originalPrice) * 100)
})

async function addToCart() {
  if (!props.product.isInStock) return
  try {
    await cart.add(props.product.id, 1)
    added.value = true
    setTimeout(() => (added.value = false), 1200)
  } catch (error: any) {
    toast.error(error.message || 'No se pudo agregar al carrito')
  }
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    router.push('/auth/login')
    return
  }
  try {
    const result = await favoritesService.toggle(props.product.id)
    isFavorite.value = result.added
    toast.success(result.message)
  } catch (error: any) {
    toast.error(error.message)
  }
}
</script>

<template>
  <div class="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:ring-2 hover:ring-brand-400/60">
    <NuxtLink :to="`/productos/${product.slug}`" class="relative block aspect-square overflow-hidden">
      <AppImage
        :src="product.images?.[0]"
        :alt="product.name"
        :seed="product.slug"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:saturate-110"
      />
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div class="absolute left-3 top-3 flex flex-col gap-1.5">
        <span
          v-if="discount"
          class="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow"
        >
          {{ discount }}% OFF
        </span>
        <span
          v-else-if="product.isFeatured"
          class="rounded-md bg-brand-600 px-2 py-0.5 text-xs font-bold text-white shadow"
        >
          Destacado
        </span>
      </div>
      <span
        v-if="!product.isInStock"
        class="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]"
      >
        <span class="rounded-lg bg-dark-800 px-4 py-1.5 text-sm font-bold text-white">Agotado</span>
      </span>
    </NuxtLink>

    <button
      class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow transition hover:scale-110 hover:text-red-500"
      :class="{ 'text-red-500': isFavorite }"
      :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      @click="toggleFavorite"
    >
      <Heart class="h-4.5 w-4.5" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>

    <div class="flex flex-1 flex-col p-4">
      <p v-if="product.brand" class="text-xs font-bold uppercase tracking-wide text-brand-600">
        {{ product.brand }}
      </p>
      <NuxtLink
        :to="`/productos/${product.slug}`"
        class="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-slate-800 transition hover:text-brand-700"
      >
        {{ product.name }}
      </NuxtLink>

      <div class="mt-3 flex items-end justify-between gap-2">
        <div>
          <PriceTag :price="product.finalPrice" :original-price="product.originalPrice" size="sm" />
          <p class="mt-0.5 text-[11px] text-slate-400">
            {{ product.isInStock ? `${product.stock} disponibles` : 'Sin stock' }}
          </p>
        </div>
      </div>

      <button
        class="btn-primary mt-3 w-full !py-2"
        :class="{ '!bg-emerald-600 hover:!bg-emerald-700': added }"
        :disabled="!product.isInStock"
        @click="addToCart"
      >
        <Check v-if="added" class="h-4 w-4" />
        <ShoppingCart v-else class="h-4 w-4" />
        {{ added ? 'Agregado' : product.isInStock ? 'Agregar al carrito' : 'Sin stock' }}
      </button>
    </div>
  </div>
</template>