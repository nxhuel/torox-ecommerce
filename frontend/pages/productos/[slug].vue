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
import { Video } from 'lucide-vue-next'
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

/** Grouped tables: admin-defined groups, or a fallback from the flat specs. */
const specGroups = computed<SpecGroup[]>(() => {
  const p = product.value
  if (!p) return []
  if (p.specGroups?.length) {
    return p.specGroups.filter((g) => g.rows?.length)
  }
  const flat = p.specifications ? Object.entries(p.specifications) : []
  if (!flat.length) return []
  return [{ title: 'Características generales', rows: flat.map(([label, value]) => ({ label, value })) }]
})

/** The 2 main bullet points; falls back to the first two spec rows. */
const highlights = computed<string[]>(() => {
  const p = product.value
  if (!p) return []
  if (p.highlights?.length) return p.highlights.slice(0, 2)
  return specGroups.value
    .flatMap((g) => g.rows)
    .slice(0, 2)
    .map((row) => `${row.label}: ${row.value}`)
})

function scrollToSpecs() {
  document.getElementById('caracteristicas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

const currentMedia = computed(() => product.value?.images?.[activeImage.value] || product.value?.images?.[0] || null)

function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogv)(\?.*)?$/i.test(url)
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

    <EmptyState v-else-if="notFound" icon="search" title="Producto no encontrado"
      description="El producto que buscás no existe o fue dado de baja.">
      <NuxtLink to="/productos" class="btn-primary">Ver productos</NuxtLink>
    </EmptyState>

    <template v-else-if="product">
      <nav class="mb-6 flex items-center gap-1.5 text-xs text-slate-400">
        <NuxtLink to="/" class="hover:text-brand-600">Inicio</NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <NuxtLink to="/productos" class="hover:text-brand-600">Productos</NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <NuxtLink v-if="product.category" :to="`/productos?categoryId=${product.categoryId}`"
          class="hover:text-brand-600">
          {{ product.category.name }}
        </NuxtLink>
        <ChevronRight class="h-3 w-3" />
        <span class="text-slate-600">{{ product.name }}</span>
      </nav>

      <div class="grid gap-8 lg:grid-cols-2 lg:gap-12"> <!-- Gallery -->
        <div>
          <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <video v-if="currentMedia && isVideo(currentMedia)" :key="currentMedia" :src="currentMedia" controls
              autoplay muted loop class="aspect-square w-full bg-black object-contain" />
            <template v-else>
              <AppImage :src="currentMedia" :alt="product.name" :seed="product.slug" class="aspect-square w-full" />
              <span v-if="discount"
                class="absolute left-4 top-4 rounded-lg bg-green-500 px-3 py-1 text-sm font-bold text-white shadow">
                {{ discount }}% OFF
              </span>
            </template>
          </div>
          <div v-if="product.images && product.images.length > 1" class="mt-3 flex flex-wrap gap-3">
            <button v-for="(media, index) in product.images" :key="media"
              class="relative overflow-hidden rounded-lg border-2 transition"
              :class="index === activeImage ? 'border-brand-600' : 'border-transparent hover:border-slate-300'"
              :aria-label="`Ver medio ${index + 1}`" @click="activeImage = index">
              <AppImage v-if="!isVideo(media)" :src="media" :alt="`${product.name} ${index + 1}`"
                :seed="`${product.slug}-${index}`" class="h-20 w-20 object-contain" />
              <span v-else class="flex h-20 w-20 items-center justify-center bg-dark-900">
                <Video class="h-6 w-6 text-white" />
              </span>
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
            <span class="rounded-full px-2.5 py-0.5 font-semibold"
              :class="product.isInStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
              {{ product.isInStock ? `Stock disponible: ${product.stock}` : 'Agotado' }}
            </span>
            <!-- <span v-if="product.salesCount > 0" class="text-slate-400">{{ product.salesCount }} vendidos</span> -->
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <PriceTag :price="product.finalPrice" :original-price="product.originalPrice" size="lg" />
            <p v-if="discount" class="mt-1 text-sm text-red-600">
              Ahorrás {{ currency((product.originalPrice || 0) - product.finalPrice) }}
            </p>
            <div class="mt-5 flex items-center gap-4">
              <QuantitySelector v-model="quantity" :max="Math.max(1, product.stock)" />
              <button class="btn-primary flex-1 !py-3" :disabled="!product.isInStock" @click="addToCart">
                <Check v-if="added" class="h-4 w-4" />
                <ShoppingCart v-else class="h-4 w-4" />
                {{ added ? 'Agregado' : 'Agregar al carrito' }}
              </button>
            </div>
            <div class="mt-3 flex gap-3">
              <button class="btn-primary flex-1 !py-3 !text-base" :disabled="!product.isInStock" @click="buyNow">
                Comprar ahora
              </button>
              <button class="btn-secondary !px-4" :class="{ '!border-red-200 !text-red-500': isFavorite }"
                :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'" @click="toggleFavorite">
                <Heart class="h-4 w-4" :fill="isFavorite ? 'currentColor' : 'none'" />
              </button>
            </div>
          </div>

          <!-- Lo que tenés que saber (visible sin scroll) -->
          <div v-if="highlights.length" class="mt-5 rounded-xl border border-slate-200 bg-white p-5">
            <h2 class="text-base font-bold text-slate-900">Lo que tenés que saber de este producto</h2>
            <ul class="mt-3 space-y-2.5">
              <li v-for="(item, index) in highlights" :key="index" class="flex items-start gap-2.5">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50">
                  <Check class="h-3.5 w-3.5 text-brand-600" />
                </span>
                <span class="text-sm leading-relaxed text-slate-700">{{ item }}</span>
              </li>
            </ul>
            <button v-if="specGroups.length"
              class="mt-3 text-sm font-semibold text-brand-600 underline underline-offset-4 transition hover:text-brand-700"
              @click="scrollToSpecs">
              Ver características
            </button>
          </div>

        </div>
      </div>

      <!-- Características del producto -->
      <section v-if="specGroups.length" id="caracteristicas" class="mt-12 scroll-mt-24">
        <h2 class="mb-5 text-xl font-bold text-slate-900 sm:text-2xl">Características del producto</h2>
        <div class="grid gap-5">
          <div v-for="group in specGroups" :key="group.title"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <h3 class="border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-base font-bold text-slate-900">
              {{ group.title }}
            </h3>
            <dl>
              <div v-for="(row, index) in group.rows" :key="`${row.label}-${index}`"
                class="flex items-baseline justify-between gap-6 px-5 py-3 text-sm"
                :class="index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'">
                <dt class="shrink-0 text-slate-500">{{ row.label }}</dt>
                <dd class="text-right font-semibold text-slate-800">{{ row.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="mt-12">
        <h2 class="mb-3 text-xl font-bold text-slate-900">Descripción</h2>
        <p class="whitespace-pre-line leading-relaxed text-slate-600">
          {{ product.description || 'Sin descripción disponible.' }}
        </p>
      </section>

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