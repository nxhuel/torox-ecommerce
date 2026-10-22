<script setup lang="ts">
import { ShoppingCart, Heart, Check, Star, Gift } from 'lucide-vue-next'
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
</script><template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5"
    :class="product.isFeatured
      ? 'bg-white ring-1 ring-slate-200/80 shadow-card dark:bg-dark-800 dark:ring-white/10'
      : 'bg-white ring-1 ring-slate-200/60 shadow-sm dark:bg-dark-800 dark:ring-white/5'
      ">
    <!-- Featured top ribbon -->
    <NuxtLink :to="`/especificacion/${product.slug}`" class="relative block aspect-square overflow-hidden !bg-white">
      <AppImage :src="product.images?.[0]" :alt="product.name" :seed="product.slug" class="h-full w-full object-contain" />
      <div
        v-if="product.promotion"
        class="absolute left-0 top-0 z-10 inline-flex max-w-[78%] items-center gap-1.5 rounded-br-xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 px-3 py-1.5 text-white shadow-md"
      >
        <Gift class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate text-[11px] font-bold uppercase tracking-wide">{{ product.promotion.name }}</span>
      </div>
      <div class="absolute left-3 flex flex-col gap-1.5" :class="product.promotion ? 'top-12' : 'top-3'">
        <span v-if="discount" class="rounded-md bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
          {{ discount }}
        </span>
      </div>
      <span v-if="!product.isInStock"
        class="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px] dark:bg-dark-900/80">
        <span
          class="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-bold text-white dark:bg-slate-200 dark:text-slate-900">Agotado</span>
      </span>
    </NuxtLink>

    <button
      class="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm transition hover:scale-105 hover:text-red-500 dark:bg-dark-800/90 dark:text-slate-500"
      :class="{ '!text-red-500': isFavorite }" :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
      @click="toggleFavorite">
      <Heart class="h-4 w-4" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>

    <div class="flex flex-1 flex-col p-3.5">
      <p v-if="product.brand"
        class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {{ product.brand }}
      </p>
      <NuxtLink :to="`/especificacion/${product.slug}`"
        class="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-800 transition hover:text-slate-600 dark:text-slate-200 dark:hover:text-white">
        {{ product.name }}
      </NuxtLink>

      <div class="mt-auto pt-3">
        <PriceTag
          :price="product.finalPrice"
          :original-price="product.price"
          size="sm"
        />
        <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
          {{ product.isInStock ? `${product.stock} disponibles` : 'Sin stock' }}
        </p>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-2">
        <button
          class="rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          :style="{ backgroundColor: '#3483FA' }" :disabled="!product.isInStock" @click="buyNow">
          Comprar ahora
        </button>
        <button
          class="rounded-lg py-2 text-sm font-semibold text-[#3483FA] transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          :style="{ backgroundColor: '#E3EDFB' }" :disabled="!product.isInStock" @click="addToCart">
          {{ added ? 'Agregado' : 'Agregar al carrito' }}
        </button>
      </div>
    </div>
  </div>
</template>