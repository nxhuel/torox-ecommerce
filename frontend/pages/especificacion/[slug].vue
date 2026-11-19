<script setup lang="ts">
import {
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  ChevronRight,
  Check,
  Gift,
} from 'lucide-vue-next'
import type { Product, SpecGroup } from '~/types'
import { Video } from 'lucide-vue-next'
import { favoritesService, productsService } from '~/services'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { PROMOTION_TYPE_LABELS, useFormat } from '~/composables/useFormat'
import { STORE, whatsappLink } from '~/utils/store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const { currency, date, promotionValue } = useFormat()
const toast = useToast()

const product = ref<Product | null>(null)
const related = ref<Product[]>([])
const loading = ref(true)
const notFound = ref(false)
const quantity = ref(1)
const activeImage = ref(0)
const selectedVariantId = ref<string | null>(null)
const isFavorite = ref(false)
const added = ref(false)

onMounted(async () => {
  try {
    product.value = await productsService.bySlug(String(route.params.slug))
    if (product.value) {
      // Preselect the first variant with stock, so the customer can buy with one click.
      const availableVariants = (product.value.variants || []).filter((variant) => variant.isActive)
      if (availableVariants.length) {
        const first = availableVariants.find((variant) => variant.stock > 0) || availableVariants[0]
        selectedVariantId.value = first.id
      }
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
  if (!p || Number(p.price) <= Number(p.finalPrice)) return null
  return ((Number(p.price) - Number(p.finalPrice)) / Number(p.price)) * 100
})

const variants = computed(() => (product.value?.variants || []).filter((variant) => variant.isActive))

/** True even if every variant is disabled: such a product is not sellable. */
const hasVariants = computed(() => (product.value?.variants || []).length > 0)

const selectedVariant = computed(
  () => variants.value.find((variant) => variant.id === selectedVariantId.value) || null,
)

/** A variant gallery replaces the product one; falls back when it has no images. */
const gallery = computed<string[]>(() => {
  const p = product.value
  if (!p) return []
  if (selectedVariant.value?.images?.length) return selectedVariant.value.images
  return p.images || []
})

const currentStock = computed(() => {
  const p = product.value
  if (!p) return 0
  if (!hasVariants.value) return p.stock
  return selectedVariant.value?.stock ?? 0
})

watch(selectedVariantId, () => {
  activeImage.value = 0
  quantity.value = 1
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
  if (hasVariants.value && !selectedVariant.value) {
    toast.error(`Elegí ${product.value.variantName || 'una variante'}`)
    return
  }
  try {
    await cart.add(product.value.id, quantity.value, selectedVariant.value?.id ?? null)
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
  if (hasVariants.value && !selectedVariant.value) {
    toast.error(`Elegí ${product.value.variantName || 'una variante'}`)
    return
  }
  cart.add(product.value.id, quantity.value, selectedVariant.value?.id ?? null).then(() => {
    router.push('/checkout')
  })
}

const currentMedia = computed(() => gallery.value[activeImage.value] || gallery.value[0] || null)

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

      <div class="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <!-- Gallery -->
        <div>
          <div
            class="product-well relative overflow-hidden rounded-2xl">
            <video v-if="currentMedia && isVideo(currentMedia)" :key="currentMedia" :src="currentMedia" controls
              autoplay muted loop class="aspect-square w-full bg-black object-contain" />
            <template v-else>
              <AppImage :src="currentMedia" :alt="product.name" :seed="product.slug" loading="eager" class="aspect-square w-full object-contain p-6 mix-blend-multiply" />
            </template>
          </div>
          <div v-if="gallery.length > 1" class="mt-3 flex flex-wrap gap-3">
            <button v-for="(media, index) in gallery" :key="media"
              class="relative overflow-hidden rounded-lg border-2 transition"
              :class="index === activeImage ? 'border-slate-900 dark:border-white' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'"
              :aria-label="`Ver medio ${index + 1}`" @click="activeImage = index">
              <AppImage v-if="!isVideo(media)" :src="media" :alt="`${product.name} ${index + 1}`"
                :seed="`${product.slug}-${index}`" class="h-20 w-20" />
              <span v-else class="flex h-20 w-20 items-center justify-center bg-dark-900">
                <Video class="h-6 w-6 text-white" />
              </span>
            </button>
          </div>
        </div>

        <!-- Info -->
        <div>
          <p v-if="product.brand"
            class="label-brass !text-sm">
            {{ product.brand }}
          </p>
          <h1 class="font-display mt-3 text-[1.9rem] leading-[1.08] text-slate-900 [text-wrap:balance] sm:text-[2.6rem] dark:text-white">{{ product.name }}</h1>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="rounded-full px-2.5 py-0.5 font-semibold"
              :class="currentStock > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'">
              {{ currentStock > 0 ? `Stock disponible: ${currentStock}` : 'Agotado' }}
            </span>
            <span v-if="product.salesCount > 0" class="text-slate-400">{{ product.salesCount }} vendidos</span>
          </div>

          <div class="mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700/70 dark:bg-dark-800">
            <PriceTag
              :price="product.finalPrice"
              :original-price="product.price"
              size="lg"
            />
            <p v-if="discount" class="mt-1 text-sm text-green-600 dark:text-green-400">
              Ahorrás {{ currency(product.price - product.finalPrice) }}
            </p>

            <div
              v-if="product.promotion"
              class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/30 dark:bg-rose-500/10"
            >
              <div class="flex items-center gap-2 text-rose-600 dark:text-rose-300">
                <Gift class="h-4 w-4 shrink-0" />
                <p class="text-sm font-bold">{{ product.promotion.name }}</p>
              </div>
              <p class="mt-1 text-xs text-rose-700/80 dark:text-rose-200/80">
                {{ PROMOTION_TYPE_LABELS[product.promotion.type] }} ·
                {{ promotionValue(product.promotion) }} ·
                Hasta el {{ date(product.promotion.endDate) }}
              </p>
            </div>

            <div v-if="variants.length" class="mt-5">
              <p class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {{ product.variantName || 'Color' }}:
                <span class="font-normal text-slate-500 dark:text-slate-400">
                  {{ selectedVariant?.name || 'Elegí una opción' }}
                </span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="variant in variants"
                  :key="variant.id"
                  type="button"
                  class="flex w-20 flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition hover:bg-slate-100 dark:hover:bg-slate-700/40"
                  :class="variant.stock === 0 ? 'opacity-50' : ''"
                  @click="selectedVariantId = variant.id"
                >
                  <span
                    class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-base font-bold uppercase text-slate-400 dark:bg-slate-700 dark:text-slate-300"
                  >
                    <AppImage
                      v-if="variant.images?.[0] || product.images?.[0]"
                      :src="variant.images?.[0] || product.images?.[0]"
                      :alt="variant.name"
                      class="h-full w-full object-cover"
                    />
                    <template v-else>{{ variant.name.charAt(0) }}</template>
                  </span>
                  <span
                    class="text-xs font-semibold leading-tight"
                    :class="selectedVariantId === variant.id
                      ? 'text-slate-900 underline underline-offset-4 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'"
                  >
                    {{ variant.name }}
                  </span>
                  <span v-if="variant.stock === 0" class="text-[10px] font-normal leading-none">Sin stock</span>
                </button>
              </div>
            </div>

            <div class="mt-5 flex items-center gap-4">
              <QuantitySelector v-model="quantity" :max="Math.max(1, currentStock)" />
            </div>
            <div class="mt-3 flex gap-3">
              <!-- Comprar ahora -->
              <button class="btn-primary flex-1 !py-3 !text-base" :disabled="currentStock === 0" @click="buyNow">
                Comprar ahora
              </button>

              <!-- Agregar al carrito -->
              <button type="button"
                class="btn flex-1 border border-slate-300 px-4 py-3 text-base text-slate-900 hover:border-slate-900 dark:border-white/20 dark:text-white dark:hover:border-white/60"
                :disabled="currentStock === 0 || added" @click="addToCart">
                <Check v-if="added" class="h-4 w-4 shrink-0" />

                <ShoppingCart v-else class="h-4 w-4 shrink-0" />

                <span>
                  {{ added ? 'Agregado' : 'Agregar al carrito' }}
                </span>
              </button>

              <!-- Favoritos -->
              <button type="button" class="btn-secondary !px-4" :class="{
                '!border-red-200 !text-red-500 dark:!border-red-500/30 dark:!text-red-400': isFavorite
              }" :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'" @click="toggleFavorite">
                <Heart class="h-4 w-4" :fill="isFavorite ? 'currentColor' : 'none'" />
              </button>
            </div>
          </div>

          <!-- Lo que tenés que saber (visible sin scroll) -->
          <div v-if="highlights.length"
            class="mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700/70 dark:bg-dark-800">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Lo que tenés que saber de este producto</h2>
            <ul class="mt-3 space-y-2.5">
              <li v-for="(item, index) in highlights" :key="index" class="flex items-start gap-2.5">
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60">
                  <Check class="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                </span>
                <span class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{{ item }}</span>
              </li>
            </ul>
            <button v-if="specGroups.length"
              class="mt-3 text-sm font-semibold text-brand-600 underline underline-offset-4 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              @click="scrollToSpecs">
              Ver características
            </button>
          </div>

          <!-- Confianza: lo que necesita saber antes de pagar -->
          <ul class="rule-brass mt-6 divide-y divide-brass-500/25 border-y text-sm">
            <li class="flex items-start gap-3 py-3">
              <Truck class="mt-0.5 h-4 w-4 shrink-0 text-brass-600 dark:text-brass-400" />
              <span class="text-slate-700 dark:text-slate-300">Envío a todo el país con seguimiento. El costo se calcula con tu código postal en el checkout.</span>
            </li>
            <li class="flex items-start gap-3 py-3">
              <CreditCard class="mt-0.5 h-4 w-4 shrink-0 text-brass-600 dark:text-brass-400" />
              <span class="text-slate-700 dark:text-slate-300">Pagás con Mercado Pago: tarjeta, débito o dinero en cuenta.</span>
            </li>
            <li class="flex items-start gap-3 py-3">
              <ShieldCheck class="mt-0.5 h-4 w-4 shrink-0 text-brass-600 dark:text-brass-400" />
              <span class="text-slate-700 dark:text-slate-300">Garantía de {{ STORE.warrantyDays }} días.</span>
            </li>
          </ul>
          <a
            :href="whatsappLink(`Hola! Tengo una consulta sobre: ${product.name}`)"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline underline-offset-4 hover:text-torox dark:text-white"
          >
            <MessageCircle class="h-4 w-4 text-[#25D366]" />
            ¿Dudas con este producto? Consultanos por WhatsApp
          </a>
        </div>
      </div>

      <!-- Características del producto -->
      <section v-if="specGroups.length" id="caracteristicas" class="mt-12 scroll-mt-24">
        <h2 class="font-display mb-5 text-[1.7rem] text-slate-900 sm:text-4xl dark:text-white">Características <span class="text-gradient-torox">del producto</span></h2>
        <div class="grid gap-5">
          <div v-for="group in specGroups" :key="group.title"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-700/70 dark:bg-dark-800">
            <h3
              class="border-b border-slate-200 bg-slate-50 px-5 py-3.5 text-base font-bold text-slate-900 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-white">
              {{ group.title }}
            </h3>
            <dl>
              <div v-for="(row, index) in group.rows" :key="`${row.label}-${index}`"
                class="flex items-baseline justify-between gap-6 px-5 py-3 text-sm"
                :class="index % 2 === 0 ? 'bg-white dark:bg-dark-800' : 'bg-slate-50/60 dark:bg-slate-900/60'">
                <dt class="shrink-0 text-slate-500 dark:text-slate-400">{{ row.label }}</dt>
                <dd class="text-right font-semibold text-slate-800 dark:text-slate-200">{{ row.value }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="mt-12">
        <h2 class="mb-3 text-xl font-bold text-slate-900 dark:text-white">Descripción</h2>
        <p class="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-400">
          {{ product.description || 'Sin descripción disponible.' }}
        </p>
      </section>

      <!-- Related -->
      <section v-if="related.length" class="mt-14">
        <h2 class="font-display mb-6 text-[1.7rem] text-slate-900 sm:text-4xl dark:text-white">Productos <span class="text-gradient-torox">relacionados</span></h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <ProductCard v-for="item in related" :key="item.id" :product="item" />
        </div>
      </section>
    </template>
  </div>
</template>
