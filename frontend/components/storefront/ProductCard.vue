<script setup lang="ts">
import { ShoppingCart, Heart, Check, Truck } from 'lucide-vue-next'
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
const { currency, percentage } = useFormat()
const toast = useToast()
const router = useRouter()

const isFavorite = ref(!!props.product.favoriteId)
const added = ref(false)

const discount = computed(() => {
  const p = props.product
  const price = Number(p.price)
  const finalPrice = Number(p.finalPrice)
  if (price <= 0 || price <= finalPrice) return null
  return `${percentage(((price - finalPrice) / price) * 100)}% OFF`
})

/** Lo que se ahorra con el descuento (en pesos), para mostrar junto al precio. */
const savings = computed(() => {
  const diff = Number(props.product.price) - Number(props.product.finalPrice)
  return diff > 0 ? diff : 0
})

/** Segunda foto (si hay) para mostrarla al pasar el mouse. */
const secondImage = computed(() => props.product.images?.[1] ?? null)

/** Sólo avisamos el stock cuando es bajo: "20 disponibles" en todo el catálogo no aporta y parece inventado. */
const lowStock = computed(() => {
  const stock = Number(props.product.stock)
  return props.product.isInStock && stock > 0 && stock <= 5 ? stock : null
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

async function buyNow() {
  if (!props.product.isInStock) return
  try {
    await cart.add(props.product.id, 1)
    router.push('/checkout')
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
  <article
    class="pcard lift group relative flex h-full flex-col rounded-[22px] bg-white p-2 ring-1 ring-slate-900/[0.06] hover:shadow-card-hover dark:bg-dark-800 dark:ring-white/[0.07]"
  >
    <!-- Foto: va en su propio "estuche" claro (las fotos vienen con fondo blanco) -->
    <NuxtLink
      :to="`/especificacion/${product.slug}`"
      class="product-well relative block aspect-square overflow-hidden rounded-2xl"
      :aria-label="product.name"
    >
      <AppImage
        :src="product.images?.[0]"
        :alt="product.name"
        :seed="product.slug"
        class="pcard-img absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply"
        :class="secondImage ? 'pcard-img--first' : ''"
      />
      <AppImage
        v-if="secondImage"
        :src="secondImage"
        :alt="''"
        :seed="`${product.slug}-2`"
        class="pcard-img pcard-img--second absolute inset-0 h-full w-full object-contain p-6 opacity-0 mix-blend-multiply"
      />

      <span class="absolute left-3 top-3 flex flex-col items-start gap-1.5">
        <span v-if="discount" class="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-brass-300">
          {{ discount }}
        </span>
        <span
          v-if="product.promotion"
          class="max-w-[10rem] truncate rounded-full bg-brass-500 px-2.5 py-1 text-[11px] font-semibold text-slate-900"
        >
          {{ product.promotion.name }}
        </span>
      </span>

      <span
        v-if="!product.isInStock"
        class="absolute inset-0 flex items-center justify-center bg-porcelain/75 backdrop-blur-[2px]"
      >
        <span class="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white">Sin stock</span>
      </span>
    </NuxtLink>

    <button
      class="fav absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,255,255,0.92)] text-[#51565d] shadow-sm ring-1 ring-black/5 backdrop-blur hover:text-rose-500"
      :class="{ '!text-rose-500': isFavorite }"
      :aria-label="isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
      :aria-pressed="isFavorite"
      @click="toggleFavorite"
    >
      <Heart class="h-[18px] w-[18px]" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>

    <!-- Datos -->
    <div class="flex flex-1 flex-col px-2.5 pb-2.5 pt-4 sm:px-3 sm:pb-3">
      <p class="label-brass truncate">
        {{ product.brand || product.category?.name || 'TOROX' }}
      </p>
      <NuxtLink
        :to="`/especificacion/${product.slug}`"
        class="mt-1.5 line-clamp-2 min-h-[2.6rem] text-[0.95rem] font-semibold leading-snug text-slate-900 hover:text-torox-deep dark:hover:text-torox-sky"
      >
        {{ product.name }}
      </NuxtLink>

      <div class="mt-auto pt-3">
        <p v-if="savings" class="text-xs text-slate-500 line-through">
          {{ currency(product.price) }}
        </p>
        <p class="font-display text-[1.3rem] tabular-nums text-slate-900 sm:text-[1.55rem]">
          {{ currency(product.finalPrice) }}
        </p>
        <p v-if="savings" class="mt-1 text-xs font-semibold text-emerald-700">
          Ahorrás {{ currency(savings) }}
        </p>
        <p v-if="lowStock" class="mt-1 text-xs font-semibold text-amber-700">
          {{ lowStock === 1 ? 'Queda la última unidad' : `Quedan ${lowStock} unidades` }}
        </p>
        <p v-else-if="product.isInStock" class="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <Truck class="h-3.5 w-3.5" /> Envío a todo el país
        </p>
      </div>

      <div class="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button
          class="btn-primary min-h-[44px] !rounded-xl !px-3 !py-0"
          :disabled="!product.isInStock"
          @click="buyNow"
        >
          <span class="sm:hidden">Comprar</span>
          <span class="hidden sm:inline">Comprar ahora</span>
        </button>
        <button
          class="btn min-h-[44px] w-11 border border-slate-300 text-slate-800 hover:border-slate-900 dark:border-white/15 dark:text-slate-100 dark:hover:border-white/50"
          :disabled="!product.isInStock"
          :aria-label="added ? 'Agregado al carrito' : 'Agregar al carrito'"
          :title="added ? 'Agregado' : 'Agregar al carrito'"
          @click="addToCart"
        >
          <Check v-if="added" class="h-[18px] w-[18px] text-emerald-500" />
          <ShoppingCart v-else class="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Foto: zoom de 1.03 dentro de su marco y cambio a la 2ª foto. Sólo con mouse. */
.pcard-img {
  transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms ease;
}
.fav {
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), color 160ms ease;
}
.fav:active {
  transform: scale(0.92);
}
@media (hover: hover) and (pointer: fine) {
  .pcard:hover .pcard-img { transform: scale(1.03); }
  .pcard:hover .pcard-img--first { opacity: 0; }
  .pcard:hover .pcard-img--second { opacity: 1; }
}
</style>
