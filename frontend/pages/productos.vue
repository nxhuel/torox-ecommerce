<script setup lang="ts">
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Package } from 'lucide-vue-next'
import type { Category, Product } from '~/types'
import { categoriesService, productsService } from '~/services'

const route = useRoute()
const router = useRouter()

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const brands = ref<string[]>([])
const total = ref(0)
const totalPages = ref(1)
const loading = ref(true)
const mobileFilters = ref(false)

const search = ref(String(route.query.search || ''))
const categoryId = ref(String(route.query.categoryId || ''))
const brand = ref(String(route.query.brand || ''))
const minPrice = ref('')
const maxPrice = ref('')
const inStock = ref(route.query.inStock === 'true')
const isOnSale = ref(route.query.isOnSale === 'true')
const isFeatured = ref(route.query.isFeatured === 'true')
const sortBy = ref(String(route.query.sortBy || 'relevance'))
const page = ref(Number(route.query.page) || 1)

const limit = 12

onMounted(async () => {
  const [cats, brs] = await Promise.all([
    categoriesService.all(true),
    productsService.brands().catch(() => []),
  ])
  categories.value = cats
  brands.value = brs
  await loadProducts()
})

watch(
  () => route.query,
  () => {
    search.value = String(route.query.search || '')
    categoryId.value = String(route.query.categoryId || '')
    brand.value = String(route.query.brand || '')
    isOnSale.value = route.query.isOnSale === 'true'
    isFeatured.value = route.query.isFeatured === 'true'
    inStock.value = route.query.inStock === 'true'
    sortBy.value = String(route.query.sortBy || 'relevance')
    page.value = Number(route.query.page) || 1
    loadProducts()
  },
)

async function loadProducts() {
  loading.value = true
  try {
    const result = await productsService.all({
      search: search.value || undefined,
      categoryId: categoryId.value || undefined,
      brand: brand.value || undefined,
      minPrice: minPrice.value ? Number(minPrice.value) : undefined,
      maxPrice: maxPrice.value ? Number(maxPrice.value) : undefined,
      inStock: inStock.value || undefined,
      isOnSale: isOnSale.value || undefined,
      isFeatured: isFeatured.value || undefined,
      sortBy: sortBy.value || undefined,
      page: page.value,
      limit,
    })
    products.value = result.items
    total.value = result.meta?.total || 0
    totalPages.value = result.meta?.totalPages || 1
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  syncQuery()
}

function syncQuery() {
  const query: Record<string, string> = {}
  if (search.value) query.search = search.value
  if (categoryId.value) query.categoryId = categoryId.value
  if (brand.value) query.brand = brand.value
  if (minPrice.value) query.minPrice = minPrice.value
  if (maxPrice.value) query.maxPrice = maxPrice.value
  if (inStock.value) query.inStock = 'true'
  if (isOnSale.value) query.isOnSale = 'true'
  if (isFeatured.value) query.isFeatured = 'true'
  if (sortBy.value && sortBy.value !== 'relevance') query.sortBy = sortBy.value
  if (page.value > 1) query.page = String(page.value)
  router.push({ path: '/productos', query })
}

function clearFilters() {
  search.value = ''
  categoryId.value = ''
  brand.value = ''
  minPrice.value = ''
  maxPrice.value = ''
  inStock.value = false
  isOnSale.value = false
  isFeatured.value = false
  sortBy.value = 'relevance'
  page.value = 1
  syncQuery()
}

function goToPage(p: number) {
  page.value = p
  syncQuery()
}

const hasActiveFilters = computed(
  () =>
    !!search.value ||
    !!categoryId.value ||
    !!brand.value ||
    !!minPrice.value ||
    !!maxPrice.value ||
    inStock.value ||
    isOnSale.value ||
    isFeatured.value,
)

const activeCategory = computed(() =>
  categories.value.find((c) => c.id === categoryId.value),
)
</script>

<template>
  <div class="container-torox py-8 overflow-x-hidden">
    <!-- Title -->
    <div class="mb-6 overflow-x-hidden">
      <nav class="text-xs text-slate-400">
        <NuxtLink to="/" class="hover:text-brand-600">Inicio</NuxtLink>
        <span class="mx-1.5">/</span>
        <span class="text-slate-600">Productos</span>
      </nav>
      <h1 class="font-display mt-3 text-[2.1rem] text-slate-900 sm:text-5xl">
        <template v-if="activeCategory"><span class="text-gradient-torox">{{ activeCategory.name }}</span></template>
        <template v-else>Todos los <span class="text-gradient-torox">productos</span></template>
      </h1>
      <p class="mt-1 text-sm text-slate-500">{{ total }} productos encontrados</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[250px_1fr] overflow-x-hidden">
      <!-- Filters sidebar -->
      <aside class="hidden lg:block overflow-x-hidden">
        <div class="sticky top-24 space-y-5">
          <div>
            <h3 class="label-brass mb-3 !text-sm">Categorías</h3>
            <div class="space-y-1">
              <button
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors"
                :class="!categoryId ? 'bg-slate-900 font-semibold text-white dark:bg-white dark:text-[#0d0e10]' : 'text-slate-600 hover:bg-slate-100'"
                @click="categoryId = ''; applyFilters()"
              >
                Todas las categorías
              </button>
              <button
                v-for="category in categories"
                :key="category.id"
                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors"
                :class="categoryId === category.id ? 'bg-slate-900 font-semibold text-white dark:bg-white dark:text-[#0d0e10]' : 'text-slate-600 hover:bg-slate-100'"
                @click="categoryId = category.id; applyFilters()"
              >
                <span>{{ category.name }}</span>
                <span v-if="(category.productCount ?? 0) > 0" class="text-xs text-slate-400">{{ category.productCount }}</span>
              </button>
            </div>
          </div>

          <div class="border-t border-slate-200 pt-5">
            <h3 class="label-brass mb-3 !text-sm">Marcas</h3>
            <select v-model="brand" class="input-base" @change="applyFilters">
              <option value="">Todas las marcas</option>
              <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>

          <div class="border-t border-slate-200 pt-5">
            <h3 class="label-brass mb-3 !text-sm">Precio</h3>
            <div class="flex items-center gap-2">
              <input v-model="minPrice" type="number" placeholder="Mín" class="input-base" />
              <span class="text-slate-400">—</span>
              <input v-model="maxPrice" type="number" placeholder="Máx" class="input-base" />
            </div>
            <button class="btn-secondary mt-3 w-full" @click="applyFilters">Aplicar</button>
          </div>

          <div class="space-y-2 border-t border-slate-200 pt-5">
            <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input v-model="inStock" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" @change="applyFilters" />
              Solo disponibles
            </label>
            <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input v-model="isFeatured" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" @change="applyFilters" />
              Destacados
            </label>
          </div>

          <button v-if="hasActiveFilters" class="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700" @click="clearFilters">
            <X class="h-4 w-4" /> Limpiar filtros
          </button>
        </div>
      </aside>

      <!-- Results -->
      <div class="overflow-x-hidden">
        <!-- Toolbar -->
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3 overflow-x-hidden">
          <button
            class="btn-secondary lg:hidden"
            @click="mobileFilters = true"
          >
            <SlidersHorizontal class="h-4 w-4" /> Filtros
          </button>
          <div class="flex items-center gap-2 text-sm text-slate-500">
            Ordenar por:
            <select v-model="sortBy" class="input-base !w-auto !py-1.5" @change="applyFilters">
              <option value="relevance">Mayor relevancia</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="best_sellers">Más vendidos</option>
            </select>
          </div>
        </div>

        <!-- Grid -->
        <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 overflow-x-hidden">
          <BaseSkeleton v-for="i in 8" :key="i" class="aspect-[3/4] !rounded-xl" />
        </div>
        <div v-else-if="products.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 overflow-x-hidden">
          <ProductCard v-for="product in products" :key="product.id" :product="product" />
        </div>
        <EmptyState
          v-else
          icon="search"
          title="No hay productos disponibles"
          description="Probá ajustando los filtros o probá con otra búsqueda."
        >
          <button class="btn-primary" @click="clearFilters">Limpiar filtros</button>
        </EmptyState>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2">
          <button
            class="btn-secondary !px-3 !py-2"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition"
            :class="p === page ? 'bg-slate-900 text-white dark:bg-white dark:text-[#0d0e10]' : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-900'"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="btn-secondary !px-3 !py-2"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile filters -->
    <BaseModal :open="mobileFilters" title="Filtros" size="sm" @close="mobileFilters = false">
      <div class="space-y-5">
        <div>
          <h3 class="label-brass mb-2 !text-sm">Categorías</h3>
          <select v-model="categoryId" class="input-base" @change="applyFilters">
            <option value="">Todas las categorías</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>
        <div>
          <h3 class="label-brass mb-2 !text-sm">Marca</h3>
          <select v-model="brand" class="input-base" @change="applyFilters">
            <option value="">Todas las marcas</option>
            <option v-for="b in brands" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div>
          <h3 class="label-brass mb-2 !text-sm">Precio</h3>
          <div class="flex items-center gap-2">
            <input v-model="minPrice" type="number" placeholder="Mín" class="input-base" />
            <span class="text-slate-400">—</span>
            <input v-model="maxPrice" type="number" placeholder="Máx" class="input-base" />
          </div>
        </div>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input v-model="inStock" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" @change="applyFilters" />
          Solo disponibles
        </label>
        <div class="flex gap-3">
          <button class="btn-secondary flex-1" @click="clearFilters; mobileFilters = false">Limpiar</button>
          <button class="btn-primary flex-1" @click="applyFilters; mobileFilters = false">Aplicar</button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>