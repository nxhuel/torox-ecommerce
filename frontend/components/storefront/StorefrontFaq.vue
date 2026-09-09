<script setup lang="ts">
import { ChevronDown, HelpCircle } from 'lucide-vue-next'

const faqs = [
  {
    question: '¿Qué calidad tienen los productos TOROX?',
    answer:
      'Trabajamos únicamente con marcas líderes del mercado de seguridad electrónica. Cada producto pasa por controles de calidad y cuenta con garantía oficial de 12 meses. Ofrecemos asesoramiento personalizado para que elijas la solución que mejor se adapta a tu espacio.',
  },
  {
    question: '¿Cómo funcionan los envíos?',
    answer:
      'Despachamos tu pedido en 24 hs hábiles a todo el país. Una vez despachado, recibís un número de seguimiento para monitorear el envío en tiempo real desde tu cuenta. El envío es gratis en compras superiores a $150.000 y los plazos varían según tu ubicación (generalmente 1 a 5 días hábiles).',
  },
  {
    question: '¿Qué medios de pago aceptan?',
    answer:
      'Aceptamos tarjetas de crédito y débito de todos los bancos, con financiación de hasta 12 cuotas sin interés en productos seleccionados. También podés pagar por transferencia bancaria. Todos los pagos se procesan de forma segura y simulada en esta demo.',
  },
  {
    question: '¿Ofrecen instalación y soporte técnico?',
    answer:
      'Sí. Contamos con técnicos especializados para la instalación de cámaras, alarmas y centrales. Además, nuestro equipo de soporte te acompaña por teléfono o chat antes y después de la compra para configurar tus equipos y resolver cualquier duda.',
  },
  {
    question: '¿Qué pasa si el producto llega dañado o tiene una falla?',
    answer:
      'Si tu producto llega en mal estado o presenta fallas de fábrica, tenés garantía de 12 meses con cambio sin vueltas. Solo contactanos dentro de los primeros 30 días con el número de pedido y coordinamos el reemplazo o la reparación sin costo.',
  },
  {
    question: '¿Cómo puedo hacer seguimiento de mi pedido?',
    answer:
      'Desde la sección "Mis compras" de tu cuenta podés ver el estado de cada pedido en tiempo real: pago aprobado, preparación, en tránsito y entregado. También te enviamos notificaciones automáticas en cada cambio de estado y podés consultar el tracking del correo con tu número de envío.',
  },
]

const openIndex = ref<number | null>(0)

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index
}
</script>

<template>
  <div>
    <div class="mx-auto mb-10 max-w-2xl text-center">
      <span class="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-600 underline">
        <!-- <HelpCircle class="h-4 w-4" /> -->
        Preguntas frecuentes
      </span>
      <h2 class="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">Todo lo que necesitás saber</h2>
      <p class="mt-2 text-slate-500">Resolvé tus dudas sobre calidad, envíos, pagos y más</p>
    </div>

    <div class="mx-auto max-w-3xl space-y-3">
      <div
        v-for="(faq, index) in faqs"
        :key="faq.question"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-200"
      >
        <button
          class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          :aria-expanded="openIndex === index"
          @click="toggle(index)"
        >
          <span class="text-sm font-bold text-slate-900 sm:text-base">{{ faq.question }}</span>
          <ChevronDown
            class="h-5 w-5 shrink-0 text-brand-600 transition-transform duration-200"
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
          <div v-if="openIndex === index" class="px-5 pb-5">
            <p class="text-sm leading-relaxed text-slate-600">{{ faq.answer }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>