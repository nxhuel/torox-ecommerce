<script setup lang="ts">
import { ArrowUpRight, MessageCircle, Mail, Instagram, ShieldCheck } from 'lucide-vue-next'
import type { Product } from '~/types'
import { productsService } from '~/services'
import { STORE, whatsappLink } from '~/utils/store'

useSeoMeta({
  title: 'TOROX — Cámaras, cerraduras inteligentes y seguridad para tu casa',
  description:
    'Cámaras Wi-Fi, cerraduras inteligentes y accesorios de seguridad con envío a todo el país. Pagás con Mercado Pago y te asesoramos por WhatsApp.',
  ogTitle: 'TOROX — Seguridad para tu casa y tu negocio',
  ogDescription: 'Cámaras, cerraduras inteligentes y accesorios con envío a todo el país.',
  ogImage: '/logo.png',
})

const featured = ref<Product[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    featured.value = await productsService.featured()
  } catch {
    featured.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <StorefrontHero />

    <!-- Destacados: sobre el fondo de la página, las cards son la superficie -->
    <section class="py-14 lg:py-24">
      <div class="container-torox">
        <div class="mb-8 flex items-end justify-between gap-4">
          <h2 class="font-display text-[2.1rem] text-slate-900 sm:text-5xl">Productos <span class="text-gradient-torox">destacados</span></h2>
          <NuxtLink to="/productos" class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-torox underline-offset-4 hover:underline dark:text-torox-sky">
            Ver todo<span class="hidden sm:inline">&nbsp;el catálogo</span> <ArrowUpRight class="h-4 w-4" />
          </NuxtLink>
        </div>
        <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          <BaseSkeleton v-for="i in 8" :key="i" class="aspect-[3/4] !rounded-2xl" />
        </div>
        <div v-else-if="featured.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          <ProductCard v-for="product in featured" :key="product.id" :product="product" />
        </div>
        <EmptyState
          v-else
          title="Todavía no hay productos destacados"
          description="Mirá el catálogo completo para ver todo lo que tenemos."
        />
      </div>
    </section>

    <!-- Momento tipográfico -->
    <StorefrontStatement />

    <!-- Opiniones -->
    <StorefrontTestimonials />

    <!-- Atención -->
    <section class="py-16 lg:py-24">
      <div class="container-torox grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 class="font-display text-[2.1rem] text-slate-900 sm:text-5xl">Del otro lado hay <span class="text-gradient-torox">una persona.</span></h2>
          <p class="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
            Somos TOROX, de {{ STORE.area }}. Si no sabés qué cámara te conviene para tu casa o tu local,
            o no te sale vincularla con la app, escribinos y lo resolvemos con vos.
          </p>
          <a
            :href="whatsappLink('Hola! Quiero hacer una consulta.')"
            target="_blank"
            rel="noopener noreferrer"
            class="btn mt-8 rounded-xl bg-[#25D366] px-6 py-3.5 text-base text-[#06231a] hover:brightness-95"
          >
            <MessageCircle class="h-5 w-5" /> Hablar por WhatsApp
          </a>
        </div>

        <ul class="rule-brass divide-y divide-brass-500/25 border-y">
          <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-4">
            <MessageCircle class="h-5 w-5 shrink-0 text-brass-600 dark:text-brass-400" />
            <span class="flex-1 text-slate-600">WhatsApp</span>
            <a :href="whatsappLink()" target="_blank" rel="noopener noreferrer" class="font-semibold text-slate-900 hover:underline">{{ STORE.whatsappDisplay }}</a>
          </li>
          <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-4">
            <Mail class="h-5 w-5 shrink-0 text-brass-600 dark:text-brass-400" />
            <span class="flex-1 text-slate-600">Mail</span>
            <a :href="`mailto:${STORE.email}`" class="font-semibold text-slate-900 hover:underline">{{ STORE.email }}</a>
          </li>
          <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-4">
            <Instagram class="h-5 w-5 shrink-0 text-brass-600 dark:text-brass-400" />
            <span class="flex-1 text-slate-600">Instagram</span>
            <a :href="STORE.social.instagram" target="_blank" rel="noopener noreferrer" class="font-semibold text-slate-900 hover:underline">{{ STORE.social.instagramHandle }}</a>
          </li>
          <li class="flex flex-wrap items-center gap-x-4 gap-y-1 py-4">
            <ShieldCheck class="h-5 w-5 shrink-0 text-brass-600 dark:text-brass-400" />
            <span class="flex-1 text-slate-600">Garantía</span>
            <span class="font-semibold text-slate-900">{{ STORE.warrantyDays }} días en todos los productos</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Preguntas frecuentes -->
    <section class="bg-[#fff] py-16 dark:bg-dark-900 lg:py-24">
      <div class="container-torox">
        <StorefrontFaq />
      </div>
    </section>
  </div>
</template>
