<script setup lang="ts">
import { ArrowRight, Percent } from 'lucide-vue-next'
import type { Category, Product } from '~/types'
import { categoriesService, productsService, promotionsService } from '~/services'
import heroVideo from '~/assets/video-fondo-hero.mp4'
import iconHogar from '~/assets/icon-hogar.png'
import iconEmpresa from '~/assets/icon-empresa.png'
import iconMonitoreo from '~/assets/icon-monitoreo.png'
import iconInstalacion from '~/assets/icon-instalacion.png'

const categories = ref<Category[]>([])
const featured = ref<Product[]>([])
const onSale = ref<Product[]>([])
const recommended = ref<Product[]>([])
const promotions = ref<any[]>([])
const loading = ref(true)

const solutions = [
  {
    name: 'Hogares',
    icon: iconHogar,
    description: 'Cámaras, alarmas y sensores para cuidar a tu familia estés donde estés.',
  },
  {
    name: 'Empresas',
    icon: iconEmpresa,
    description: 'Sistemas de CCTV y control de acceso para proteger tu negocio.',
  },
  {
    name: 'Monitoreo',
    icon: iconMonitoreo,
    description: 'Vigilá en tiempo real desde el celular con visión remota.',
  },
  {
    name: 'Instalación',
    icon: iconInstalacion,
    description: 'Asesoramiento y soporte técnico profesional en cada compra.',
  },
]

onMounted(async () => {
  try {
    const [cats, feat, sale, recs, promos] = await Promise.all([
      categoriesService.all(true),
      productsService.featured(),
      productsService.onSale(),
      productsService.all({ sortBy: 'best_sellers', limit: 8, inStock: true }),
      promotionsService.active(),
    ])
    categories.value = cats
    featured.value = feat
    onSale.value = sale
    recommended.value = recs.items
    promotions.value = promos
  } finally {
    loading.value = false
  }
})

const saleBanner = computed(() =>
  promotions.value.find((p) => p.type === 'PERCENTAGE_DISCOUNT'),
)
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative flex min-h-[85vh] items-center overflow-hidden bg-dark-900 lg:min-h-screen">
      <video
        class="absolute inset-0 h-full w-full object-cover"
        :src="heroVideo"
        autoplay
        muted
        loop
        playsinline
      />
      <div class="absolute inset-0 bg-gradient-to-b from-dark-950/70 via-dark-950/50 to-dark-950/80" />

      <div class="container-torox relative py-24 text-center">
        <div class="mx-auto max-w-3xl">
          <h1 class="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            PROTECCIÓN INTELIGENTE PARA LO QUE MÁS IMPORTA
          </h1>
          <p class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            Soluciones avanzadas de seguridad para hogares y empresas. Cámaras, alarmas y tecnología diseñada para proteger tus espacios las 24 horas.
          </p>
          <div class="mt-10 flex flex-wrap justify-center gap-4">
            <NuxtLink to="/productos" class="btn-primary !px-8 !py-3.5 !text-base">
              Protegete <ArrowRight class="h-5 w-5" />
            </NuxtLink>
            <NuxtLink to="/productos?isOnSale=true" class="btn !border !border-white/20 !bg-white/10 !px-8 !py-3.5 !text-base !text-white backdrop-blur hover:!bg-white/20">
              <Percent class="h-5 w-5" /> Ver ofertas
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="container-torox py-12 lg:py-16">
      <div class="mb-8 flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">Categorías</h2>
          <p class="mt-1 text-sm text-slate-500">Todo lo que necesitás para proteger tu espacio</p>
        </div>
        <NuxtLink to="/productos" class="hidden items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex">
          Ver todo <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>

      <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <BaseSkeleton v-for="i in 6" :key="i" class="aspect-[4/5] !rounded-xl" />
      </div>
      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <CategoryCard v-for="category in categories.slice(0, 6)" :key="category.id" :category="category" />
      </div>
    </section>

    <!-- Featured -->
    <section class="bg-white py-12 lg:py-16">
      <div class="container-torox">
        <div class="mb-8 flex items-end justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">Productos destacados</h2>
            <p class="mt-1 text-sm text-slate-500">Selección especial de nuestro catálogo</p>
          </div>
          <NuxtLink to="/productos?isFeatured=true" class="hidden items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex">
            Ver todos <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>

        <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <BaseSkeleton v-for="i in 8" :key="i" class="aspect-[3/4] !rounded-xl" />
        </div>
        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <ProductCard v-for="product in featured" :key="product.id" :product="product" />
        </div>
      </div>
    </section>

    <!-- Promo banner -->
    <section v-if="saleBanner || onSale.length" class="container-torox py-12">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-accent-500 px-6 py-10 text-white sm:px-12">
        <div class="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div class="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/10" />
        <div class="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div class="max-w-xl">
            <p class="text-xs font-bold uppercase tracking-widest text-accent-200">
              {{ saleBanner ? saleBanner.name : 'Ofertas imperdibles' }}
            </p>
            <h2 class="mt-2 text-2xl font-extrabold sm:text-3xl">
              {{ saleBanner?.description || 'Descuentos en productos seleccionados' }}
            </h2>
          </div>
          <NuxtLink to="/productos?isOnSale=true" class="btn-dark shrink-0 !border-0 !bg-white !text-brand-700 hover:!bg-slate-100">
            Comprar ahora <ArrowRight class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- On sale -->
    <section v-if="onSale.length" class="py-4">
      <div class="container-torox">
        <div class="mb-8 flex items-end justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">
              <span class="text-red-600">Ofertas</span> de la semana
            </h2>
            <p class="mt-1 text-sm text-slate-500">Precios especiales por tiempo limitado</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <ProductCard v-for="product in onSale" :key="product.id" :product="product" />
        </div>
      </div>
    </section>

    <!-- Solutions -->
    <section class="bg-dark-800 py-12 lg:py-16">
      <div class="container-torox">
        <div class="mx-auto mb-10 max-w-2xl text-center">
          <h2 class="text-2xl font-bold text-white sm:text-3xl">Soluciones para cada espacio</h2>
          <p class="mt-2 text-slate-400">Diseñamos la protección que tu hogar o negocio necesita</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="solution in solutions"
            :key="solution.name"
            class="rounded-xl border border-white/10 bg-white/5 p-6 transition-transform duration-300 hover:scale-[1.03]"
          >
            <img :src="solution.icon" :alt="solution.name" class="h-14 w-14 object-contain" />
            <h3 class="mt-4 text-lg font-bold text-white">{{ solution.name }}</h3>
            <p class="mt-1.5 text-sm text-slate-400">{{ solution.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Recommended -->
    <section v-if="recommended.length" class="container-torox py-12 lg:py-16">
      <div class="mb-8 flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 sm:text-3xl">Los más vendidos</h2>
          <p class="mt-1 text-sm text-slate-500">Lo que más eligen nuestros clientes</p>
        </div>
        <NuxtLink to="/productos?sortBy=best_sellers" class="hidden items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex">
          Ver todos <ArrowRight class="h-4 w-4" />
        </NuxtLink>
      </div>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <ProductCard v-for="product in recommended" :key="product.id" :product="product" />
      </div>
    </section>

    <!-- FAQ -->
    <section class="bg-white py-12 lg:py-16">
      <div class="container-torox">
        <StorefrontFaq />
      </div>
    </section>
  </div>
</template>