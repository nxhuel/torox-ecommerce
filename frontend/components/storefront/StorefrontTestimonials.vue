<script setup lang="ts">
import { Star, BadgeCheck, Quote } from 'lucide-vue-next'

/**
 * Opiniones de clientes reales de TOROX (confirmado por el equipo).
 * Para sumar una nueva, agregá un objeto a la lista. No cargues opiniones
 * inventadas: la sección dice "verificadas".
 */
const reviews = [
  {
    name: 'Martina',
    place: 'Hogar · Villa Urquiza',
    initials: 'ML',
    text: 'Compré la cámara para mi bebé y la calidad de imagen es muy buena. La enviaron rápido y llegó en perfecto estado.',
    date: '12 de marzo de 2026',
  },
  {
    name: 'Gonzalo',
    place: 'Empresa · Microcentro',
    initials: 'GP',
    text: 'Equipamos nuestras dos sucursales con cámaras. Todo llegó completo y el monitoreo funciona a la perfección. Muy conformes.',
    date: '28 de febrero de 2026',
  },
  {
    name: 'Sofía',
    place: 'Hogar · Belgrano',
    initials: 'SA',
    text: 'Me compré una cerradura inteligente con huella y es un cambio total. La calidad del producto es primera y el envío fue puntual. Se nota que trabajan con buenas marcas.',
    date: '21 de enero de 2026',
  },
  {
    name: 'Julián',
    place: 'Empresa · Avellaneda',
    initials: 'JS',
    text: 'Compré las cámaras para el local y el seguimiento del pedido fue transparente. Todo llegó perfecto. Muy conforme.',
    date: '9 de enero de 2026',
  },
]

const [featured, ...rest] = reviews
</script>

<template>
  <section class="bg-[#fff] py-16 dark:bg-dark-900 lg:py-24">
    <div class="container-torox grid gap-10 lg:grid-cols-[0.9fr_2fr] lg:gap-14">
      <!-- Encabezado -->
      <div class="lg:sticky lg:top-32 lg:self-start">
        <p class="label-brass flex items-center gap-2 !text-sm">
          <BadgeCheck class="h-5 w-5" />
          Opiniones verificadas
        </p>
        <h2 class="font-display mt-4 text-[2.1rem] text-slate-900 sm:text-5xl">
          Lo que opinan <span class="text-gradient-torox">nuestros clientes</span>
        </h2>
        <p class="mt-4 text-lg text-slate-600">Familias y empresas ya confían en TOROX</p>

        <div class="mt-8 flex items-center gap-4">
          <span class="font-display text-6xl text-slate-900">5,0</span>
          <div>
            <div class="flex gap-0.5" aria-label="5 de 5 estrellas">
              <Star v-for="i in 5" :key="i" class="h-5 w-5 fill-brass-400 text-brass-400" />
            </div>
            <p class="mt-1 text-sm text-slate-500">Promedio de {{ reviews.length }} opiniones</p>
          </div>
        </div>
      </div>

      <!-- Opiniones: en celular se deslizan de costado; en escritorio, grilla -->
      <div class="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0">
        <!-- Destacada -->
        <figure
          class="relative flex w-[86%] shrink-0 snap-start flex-col rounded-3xl bg-[#0d0e10] p-7 text-white ring-1 ring-brass-500/25 dark:bg-dark-800 md:col-span-2 md:w-auto md:p-9"
        >
          <Quote class="absolute right-7 top-7 h-10 w-10 text-brass-500/50" aria-hidden="true" />
          <div class="flex gap-0.5" aria-label="5 de 5 estrellas">
            <Star v-for="i in 5" :key="i" class="h-4 w-4 fill-brass-400 text-brass-400" />
          </div>
          <blockquote class="mt-4 max-w-2xl text-lg leading-relaxed text-slate-100 md:text-2xl md:leading-snug">
            “{{ featured.text }}”
          </blockquote>
          <figcaption class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              <span class="block font-semibold text-white">{{ featured.name }}</span>
              <span class="block text-sm text-slate-400">{{ featured.place }} · {{ featured.date }}</span>
            </span>
            <span class="flex items-center gap-1.5 rounded-full bg-brass-400/15 px-3 py-1 text-xs font-semibold text-brass-300 md:ml-auto">
              <BadgeCheck class="h-3.5 w-3.5" /> Compra verificada
            </span>
          </figcaption>
        </figure>

        <figure
          v-for="review in rest"
          :key="review.name"
          class="flex w-[86%] shrink-0 snap-start flex-col rounded-3xl bg-[#f3f4f6] p-6 ring-1 ring-slate-900/[0.05] dark:bg-dark-800 dark:ring-white/[0.07] md:w-auto"
          :class="review === rest[rest.length - 1] && rest.length % 2 === 1 ? 'md:col-span-2' : ''"
        >
          <div class="flex gap-0.5" aria-label="5 de 5 estrellas">
            <Star v-for="i in 5" :key="i" class="h-4 w-4 fill-brass-400 text-brass-400" />
          </div>
          <blockquote class="mt-3 flex-1 leading-relaxed text-slate-700">“{{ review.text }}”</blockquote>
          <figcaption class="mt-5 flex items-center gap-3 border-t border-slate-900/[0.08] pt-4 dark:border-white/10">
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold text-slate-900">{{ review.name }}</span>
              <span class="block truncate text-sm text-slate-500">{{ review.place }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-1 text-xs font-semibold text-brass-700 dark:text-brass-400" :title="`Compra verificada · ${review.date}`">
              <BadgeCheck class="h-4 w-4" /> Verificada
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
