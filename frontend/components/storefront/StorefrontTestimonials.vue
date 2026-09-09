<script setup lang="ts">
import { ThumbsUp, Star, ChevronLeft, ChevronRight, CalendarDays, Check } from 'lucide-vue-next'

const testimonials = [
  {
    name: 'Martina López',
    location: 'Hogar · Villa Urquiza',
    initials: 'ML',
    color: 'bg-gradient-to-br from-brand-500 to-brand-700',
    text: 'Compré un kit de cámaras WiFi y la instalación fue rapidísima. La calidad de imagen de noche es increíble, y desde el celular veo todo en tiempo real. ¡Súper recomendables!',
    date: '12 de marzo de 2026',
  },
  {
    name: 'Gonzalo Pérez',
    location: 'Empresa · Microcentro',
    initials: 'GP',
    color: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    text: 'Equipamos nuestras dos sucursales con CCTV y control de acceso. El asesoramiento previo fue excelente y el monitoreo funciona a la perfección. Muy profesionales.',
    date: '28 de febrero de 2026',
  },
  {
    name: 'Carolina Fernández',
    location: 'Hogar · Palermo',
    initials: 'CF',
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    text: 'El videoportero llegó antes de lo esperado y en perfecto estado. La app es sencillísima de usar y la atención postventa fue de otro nivel. Volvería a comprar sin dudar.',
    date: '15 de febrero de 2026',
  },
  {
    name: 'Diego Ramírez',
    location: 'Empresa · Zona Norte',
    initials: 'DR',
    color: 'bg-gradient-to-br from-violet-500 to-purple-700',
    text: 'Instalaron la central de alarmas en mi depósito. Respuesta inmediata ante cualquier evento y el equipo técnico siempre disponible. La mejor inversión en seguridad que hice.',
    date: '3 de febrero de 2026',
  },
  {
    name: 'Sofía Aguirre',
    location: 'Hogar · Belgrano',
    initials: 'SA',
    color: 'bg-gradient-to-br from-rose-500 to-pink-700',
    text: 'Excelente atención de principio a fin. Me asesoraron para elegir los sensores correctos para mi casa y la instalación quedó impecable. Se nota que saben lo que venden.',
    date: '21 de enero de 2026',
  },
  {
    name: 'Julián Sosa',
    location: 'Empresa · Avellaneda',
    initials: 'JS',
    color: 'bg-gradient-to-br from-cyan-500 to-sky-700',
    text: 'Compré las cámaras para el local y el seguimiento del pedido fue transparente. Todo llegó perfecto, con garantía y a un precio muy competitivo. Muy conforme.',
    date: '9 de enero de 2026',
  },
]

const track = ref<HTMLElement | null>(null)

function scrollByCard(direction: 1 | -1) {
  const el = track.value
  if (!el) return
  const card = el.querySelector<HTMLElement>('[data-testimonial-card]')
  const amount = card ? card.offsetWidth + 20 : 360
  el.scrollBy({ left: direction * amount, behavior: 'smooth' })
}
</script>

<template>
  <section class="py-14 lg:py-20">
    <div class="container-torox">
      <div class="mx-auto mb-10 max-w-2xl text-center">
        <span class="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-600 underline">
          <!-- <Star class="h-4 w-4 fill-current text-yellow-400" /> -->
          Opiniones verificadas
        </span>
        <h2 class="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Lo que opinan nuestros clientes</h2>
        <p class="mt-2 text-slate-500">Más de 2.000 familias y empresas ya confían en TOROX</p>
      </div>

      <div class="relative">
        <div
          ref="track"
          class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-4"
        >
          <div
            v-for="testimonial in testimonials"
            :key="testimonial.name"
            data-testimonial-card
            class="relative w-[85%] shrink-0 snap-start sm:w-[380px]"
          >
            <div class="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <!-- Medal + author -->
              <div class="flex items-center gap-3">
                <span
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-white shadow-md ring-2 ring-amber-300/60"
                  title="Distinción del Cliente"
                >
                  <ThumbsUp class="h-5 w-5 fill-current" />
                </span>
                <div class="min-w-0">
                  <p class="truncate text-xs font-black uppercase tracking-wider text-amber-600">
                    Distinción del Cliente
                  </p>
                  <p class="truncate text-sm font-bold text-slate-900">{{ testimonial.name }}</p>
                  <p class="truncate text-xs text-slate-500">{{ testimonial.location }}</p>
                </div>
                <span
                  class="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow"
                  :class="testimonial.color"
                >
                  {{ testimonial.initials }}
                </span>
              </div>

              <!-- Stars -->
              <div class="mt-4 flex items-center gap-1">
                <Star v-for="star in 5" :key="star" class="h-4 w-4 fill-current text-yellow-400" />
                <span class="ml-2 text-sm font-extrabold text-emerald-600">Excelente: 5/5</span>
              </div>

              <!-- Review -->
              <p class="mt-3 text-sm leading-relaxed text-slate-600">
                “{{ testimonial.text }}”
              </p>

              <!-- Date + stamp -->
              <div class="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <span class="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <CalendarDays class="h-3.5 w-3.5" />
                  {{ testimonial.date }}
                </span>
                <span
                  class="flex rotate-[-8deg] items-center gap-1 rounded-md border-2 border-double border-emerald-500/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600"
                >
                  <Check class="h-3 w-3" />
                  Verificado
                </span>
              </div>
            </div>

            <!-- Bubble tail -->
            <span
              class="absolute -bottom-1.5 left-10 h-4 w-4 rotate-45 border-b border-r border-slate-200 bg-white"
            />
          </div>
        </div>

        <!-- Arrows -->
        <button
          class="absolute -left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-card transition hover:bg-brand-600 hover:text-white lg:flex"
          aria-label="Anteriores"
          @click="scrollByCard(-1)"
        >
          <ChevronLeft class="h-5 w-5" />
        </button>
        <button
          class="absolute -right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-card transition hover:bg-brand-600 hover:text-white lg:flex"
          aria-label="Siguientes"
          @click="scrollByCard(1)"
        >
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
    </div>
  </section>
</template>