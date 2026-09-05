<script setup lang="ts">
import {
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Check,
} from 'lucide-vue-next'
import type { Product } from '~/types'
import { favoritesService, productsService } from '~/services'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useFormat } from '~/composables/useFormat'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const { currency } = useFormat()
const toast = useToast()

const product = ref<Product | null>(null)
const related = ref<Product[]>([])
const loading = ref(true)
const notFound = ref(false)
const quantity = ref(1)
const activeImage = ref(0)
const isFavorite = ref(false)
const added = ref(false)

onMounted(async () => {
  try {
    product.value = await productsService.bySlug(String(route.params.slug))
    if (product.value) {
      const [rel] = await Promise.all([
        productsService.related(product.value.id, product.value.categoryId),
      ])
      related.value = rel.filter((p) => p.id !== product.value?.id).slice(0, 4)
      if (auth.isAuthenticated) {
        try {
          const ids = await favoritesService.ids()
          isFavorite.value = ids.includes(product.value!.id)
        } catch {
          // ignore
        }
      }
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const discount = computed(() => {
  const p = product.value
  if (!p?.originalPrice || p.originalPrice <= p.price) return null
  return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
})

const specs = computed(() => {
  const s = product.value?.specifications
  if (!s) return []
  return Object.entries(s)
})

async function addToCart() {
  if (!product.value) return
  try {
    await cart.add(product.value.id, quantity.value)
    added.value = true
    toast.success('Producto agregado al carrito')
    setTimeout(() => (added.value = false), 1500)
  } catch (error: any) {
    toast.error(error.message)
  }
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    router.push('/auth/login')
    return
  }
  const result = await favoritesService.toggle(product.value!.id)
  isFavorite.value = result.added
  toast.success(result.message)
}

function buyNow() {
  if (!product.value) return
  cart.add(product.value.id, quantity.value).then(() => {
    router.push('/checkout')
  })
}
</script>

<template>
  <div class="container-torox py-8">
    <div v-if="loading" class="grid gap-8 lg:grid-cols-2">
      <BaseSkeleton class="aspect-square !rounded-2xl" />
      <div class="space-y-4">
        <BaseSkeleton class="h-8 w-2/3" />
        <BaseSkeleton class="h-4 w-1/3" />
        <BaseSkeleton class="h-12 w-1/2" />
        <BaseSkeleton class="h-24 w-full" />
      </div>
    </div>

    <EmptyState
      v-else-if="notFound"
      icon="search"
      title="Producto no encontrado"
      description="El producto que buscás no existe o fue dado de baja."
    >
      <NuxtLink to="/productos" class="btn-primary">Ver productos</NuxtLink>
    </EmptyState>

    <template v-else-if="product">
      <nav class="mb-6 flex items-center gap-1.5 text-xs text-slate-400">
        <NuxtLink to="/" class="hover:text-brand-600">Inicio</NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <NuxtLink to="/productos" class="hover:text-brand-600">Productos</NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <NuxtLink v-if="product.category" :to="`/productos?categoryId=${product.categoryId}`" class="hover:text-brand-600">
          {{ product.category.name }}
        </NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <span class="text-slate-600">{{ product.name }}</span>
      </nav>

      <div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <!-- Gallery -->
        <div>
          <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <AppImage
              :src="product.images?.[activeImage] || product.images?.[0]"
              :alt="product.name"
              :seed="product.slug"
              class="aspect-square w-full"
            />
            <span
              v-if="discount"
              class="absolute left-4 top-4 rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white shadow"
            >
              {{ discount }}% OFF
            </span>
          </div>
          <div v-if="product.images && product.images.length > 1" class="mt-3 flex gap-3">
            <button
              v-for="(image, index) in product.images.slice(0, 4)"
              :key="index"
              class="overflow-hidden rounded-lg border-2 transition"
              :class="index === activeImage ? 'border-brand-600' : 'border-transparent hover:border-slate-300'"
              @click="activeImage = index"
            >
              <AppImage :src="image" :alt="`${product.name} ${index + 1}`" :seed="`${product.slug}-${index}`" class="h-20 w-20" />
            </button>
          </div>
        </div>

        <!-- Info -->
        <div>
          <p v-if="product.brand" class="text-sm font-semibold uppercase tracking-wide text-brand-600">
            {{ product.brand }}
          </p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{{ product.name }}</h1>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span
              class="rounded-full px-2.5 py-0.5 font-semibold"
              :class="product.isInStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
            >
              {{ product.isInStock ? `Stock disponible: ${product.stock}` : 'Agotado' }}
            </span>
            <span v-if="product.salesCount > 0" class="text-slate-400">{{ product.salesCount }} vendidos</span>
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <PriceTag :price="product.finalPrice" :original-price="product.originalPrice" size="lg" />
            <p v-if="discount" class="mt-1 text-sm text-red-600">
              Ahorrás {{ currency((product.originalPrice || 0) - product.finalPrice) }}
            </p>
            <p class="mt-2 text-xs text-slate-500">En 6 cuotas de {{ currency(product.finalPrice / 6) }} sin interés</p>

            <div class="mt-5 flex items-center gap-4">
              <QuantitySelector v-model="quantity" :max="Math.max(1, product.stock)" />
              <button
                class="btn-primary flex-1 !py-3"
                :disabled="!product.isInStock"
                @click="addToCart"
              >
                <Check v-if="added" class="h-4 w-4" />
                <ShoppingCart v-else class="h-4 w-4" />
                {{ added ? 'Agregado' : 'Agregar al carrito' }}
              </button>
            </div>
            <div class="mt-3 flex gap-3">
              <button class="btn-secondary flex-1" :disabled="!product.isInStock" @click="buyNow">
                Comprar ahora
              </button>
              <button
                class="btn-secondary !px-4"
                :class="{ '!border-red-200 !text-red-500': isFavorite }"
                :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
                @click="toggleFavorite"
              >
                <Heart class="h-4 w-4" :fill="isFavorite ? 'currentColor' : 'none'" />
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
              <Truck class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p class="text-sm font-semibold text-slate-800">Envío simulado por Andreani</p>
                <p class="text-xs text-slate-500">Gratis en compras superiores a $50.000</p>
              </div>
            </div>
            <div class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
              <CreditCard class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p class="text-sm font-semibold text-slate-800">Pago simulado</p>
                <p class="text-xs text-slate-500">Tarjetas y transferencia</p>
              </div>
            </div>
            <div class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
              <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p class="text-sm font-semibold text-slate-800">Garantía de 12 meses</p>
                <p class="text-xs text-slate-500">Cubierta por el fabricante</p>
              </div>
            </div>
            <div class="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
              <RefreshCw class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p class="text-sm font-semibold text-slate-800">Cambio fácil</p>
                <p class="text-xs text-slate-500">30 días para devoluciones</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Description + specs -->
      <div class="mt-12 grid gap-6 lg:grid-cols-5">
        <div class="lg:col-span-3">
          <h2 class="mb-3 text-xl font-bold text-slate-900">Descripción</h2>
          <p class="whitespace-pre-line leading-relaxed text-slate-600">
            {{ product.description || product.shortDescription || 'Sin descripción disponible.' }}
          </p>
        </div>
        <div v-if="specs.length" class="lg:col-span-2">
          <h2 class="mb-3 text-xl font-bold text-slate-900">Especificaciones</h2>
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div
              v-for="([key, value], index) in specs"
              :key="key"
              class="flex justify-between gap-4 px-4 py-3 text-sm"
              :class="index % 2 === 0 ? 'bg-slate-50' : 'bg-white'"
            >
              <span class="font-medium text-slate-500">{{ key }}</span>
              <span class="text-right font-semibold text-slate-800">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Related -->
      <section v-if="related.length" class="mt-14">
        <h2 class="mb-6 text-xl font-bold text-slate-900 sm:text-2xl">Productos relacionados</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <ProductCard v-for="item in related" :key="item.id" :product="item" />
        </div>
      </section>
    </template>
  </div>
</template>