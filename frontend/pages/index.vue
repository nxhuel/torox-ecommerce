<script setup lang="ts">
import { ArrowRight, Percent, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Category, Product } from '~/types'
import { categoriesService, productsService } from '~/services'

import iconHogar from '~/assets/icon-hogar.png'
import iconEmpresa from '~/assets/icon-empresa.png'
import iconMonitoreo from '~/assets/icon-monitoreo.png'
import iconInstalacion from '~/assets/icon-instalacion.png'
import heroSlide1 from '~/assets/fondo-hero-uno.png'
import heroSlide2 from '~/assets/fondo-hero-dos.png'
import heroSlide3 from '~/assets/fondo-hero-tres.png'

const categories = ref<Category[]>([])
const featured = ref<Product[]>([])
const loading = ref(true)

const heroSlides = [
  {
    image: heroSlide1,
    title: 'PROTECCIÓN INTELIGENTE PARA LO QUE MÁS IMPORTA',
    description: 'Soluciones avanzadas de seguridad para hogares y empresas. Cámaras, alarmas y tecnología diseñada para proteger tus espacios las 24 horas.',
    ctaText: 'Protegete',
    ctaLink: '/productos',
    secondaryCtaText: 'Ver ofertas',
    secondaryCta: '/productos?isOnSale=true',
  },
  {
    image: heroSlide2,
    title: 'VIGILANCIA EN TIEMPO REAL',
    description: 'Monitoreá tus espacios desde cualquier lugar del mundo. Tú decides cuándo, cómo y desde qué dispositivo.',
    ctaText: 'Ver monitoreo',
    ctaLink: '/productos',
    secondaryCtaText: 'Explorar cámaras',
    secondaryCta: '/productos?search=camaras',
  },
  {
    image: heroSlide3,
    title: 'SOLUCIONES DE SEGURIDAD PARA TU NEGOCIO',
    description: 'Control de acceso, CCTV y alarmas integradas. Protección profesional para tu equipo y tus clientes.',
    ctaText: 'Protege tu negocio',
    ctaLink: '/productos',
    secondaryCtaText: 'Ver destacados',
    secondaryCta: '/productos?isFeatured=true',
  },
]

const currentIndex = ref(0)
const currentSlide = computed(() => heroSlides[currentIndex.value])

let heroTimer: ReturnType<typeof setInterval> | null = null

function next() {
  currentIndex.value = (currentIndex.value + 1) % heroSlides.length
  resetTimer()
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + heroSlides.length) % heroSlides.length
  resetTimer()
}

function goTo(idx: number) {
  currentIndex.value = idx
  resetTimer()
}

function resetTimer() {
  if (heroTimer) clearInterval(heroTimer)
  heroTimer = setInterval(next, 6000)
}

onMounted(() => {
  resetTimer()
})

onUnmounted(() => {
  if (heroTimer) clearInterval(heroTimer)
})

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
    const [cats, feat] = await Promise.all([
      categoriesService.all(true),
      productsService.featured(),
    ])
    categories.value = cats
    featured.value = feat
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <!-- Hero carousel -->
    <section class="relative overflow-hidden bg-dark-900">
      <div class="absolute inset-0">
        <Transition name="fade">
          <img
            :key="currentIndex"
            :src="currentSlide.image"
            :alt="currentSlide.title"
            class="absolute inset-0 h-full w-full object-cover"
          />
        </Transition>
        <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
      </div>

      <div class="container-torox relative flex min-h-[70vh] flex-col items-center justify-center py-24 text-center lg:min-h-[80vh]">
        <Transition name="fade" mode="out-in">
          <div :key="currentIndex" class="mx-auto max-w-3xl">
            <h1 class="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              {{ currentSlide.title }}
            </h1>
            <p class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              {{ currentSlide.description }}
            </p>
            <div class="mt-10 flex flex-wrap justify-center gap-4">
              <NuxtLink :to="currentSlide.ctaLink" class="btn-primary !px-8 !py-3.5 !text-base">
                {{ currentSlide.ctaText }} <ArrowRight class="h-5 w-5" />
              </NuxtLink>
              <NuxtLink :to="currentSlide.secondaryCta" class="btn !border !border-white/20 !bg-white/10 !px-8 !py-3.5 !text-base !text-white backdrop-blur hover:!bg-white/20">
                {{ currentSlide.secondaryCtaText }} <Percent class="h-5 w-5" />
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Hero nav arrows -->
      <button
        class="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white sm:left-8"
        aria-label="Anterior slide"
        @click="prev"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>
      <button
        class="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white sm:right-8"
        aria-label="Siguiente slide"
        @click="next"
      >
        <ChevronRight class="h-5 w-5" />
      </button>

      <!-- Dots -->
      <div class="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        <button
          v-for="(slide, idx) in heroSlides"
          :key="idx"
          class="h-2 w-6 cursor-pointer rounded-full bg-white/40 transition-all duration-300 hover:bg-white/60"
          :class="idx === currentIndex ? '!w-10 !bg-white' : ''"
          :aria-label="`Slide ${idx + 1}`"
          @click="goTo(idx)"
        />
      </div>
    </section>

    <!-- Benefits card -->
    <div class="relative z-10 -mt-12 mb-4">
      <div class="container-torox">
        <StorefrontBenefits />
      </div>
    </div>

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

    <!-- Testimonials -->
    <StorefrontTestimonials />

    <!-- FAQ -->
    <section class="bg-white py-12 lg:py-16">
      <div class="container-torox">
        <StorefrontFaq />
      </div>
    </section>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.7s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
