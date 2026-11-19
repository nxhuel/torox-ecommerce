<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { STORE } from '~/utils/store'

const faqs = [
  {
    question: '¿Qué calidad tienen los productos TOROX?',
    answer:
      'Trabajamos únicamente con marcas líderes del mercado de seguridad electrónica. Cada producto pasa por controles de calidad y cuenta con garantía oficial de 30 días.',
  },
  {
    question: '¿Cómo funcionan los envíos?',
    answer:
      'Despachamos tu pedido en 24 hs hábiles a todo el país. Una vez despachado, recibís un número de seguimiento para monitorear el envío en tiempo real desde tu cuenta. El costo del envío corre por cuenta del comprador y los plazos varían según tu ubicación.',
  },
  {
    question: '¿Puedo consultar antes de comprar?',
    answer:
      `Sí. Escribinos por WhatsApp al ${STORE.whatsappDisplay} y te ayudamos a elegir el producto según tu casa o negocio. Te respondemos personas, no un bot.`,
  },
  {
    question: '¿Cómo sigo mi pedido?',
    answer:
      'Cuando despachamos tu compra te llega un mail con el número de seguimiento. También lo ves en Mi cuenta → Mis compras, con cada movimiento del correo.',
  },
  {
    question: '¿Qué medios de pago aceptan?',
    answer:
      'Aceptamos tarjetas de crédito y débito de todos los bancos. La posibilidad de financiación y las cuotas dependen de cada tarjeta; no ofrecemos cuotas sin interés. También podés pagar por transferencia bancaria.',
  }
]

const openIndex = ref<number | null>(0)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_1.8fr] lg:gap-16">
    <div>
      <h2 class="font-display text-4xl text-slate-900 sm:text-5xl">Preguntas <span class="text-gradient-torox">frecuentes</span></h2>
      <p class="mt-3 text-slate-500">
        ¿No encontrás tu respuesta?
        <a :href="`https://wa.me/${STORE.whatsapp}`" target="_blank" rel="noopener noreferrer" class="font-semibold text-torox underline underline-offset-4 dark:text-torox-sky">Escribinos por WhatsApp</a>.
      </p>
    </div>

    <div class="border-b border-slate-200">
      <div
        v-for="(faq, index) in faqs"
        :key="faq.question"
        class="border-t border-slate-200"
      >
        <button
          class="flex w-full items-center justify-between gap-4 py-5 text-left"
          :aria-expanded="openIndex === index"
          @click="toggle(index)"
        >
          <span class="text-base font-semibold text-slate-900 sm:text-lg">{{ faq.question }}</span>
          <ChevronDown
            class="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200"
            :class="openIndex === index ? 'rotate-180' : ''"
          />
        </button>
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div v-if="openIndex === index" class="pb-6 pr-10">
            <p class="max-w-prose leading-relaxed text-slate-600">{{ faq.answer }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>