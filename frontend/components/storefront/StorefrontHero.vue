<script setup lang="ts">
import { STORE, whatsappLink } from '~/utils/store'
import heroDay from '~/assets/hero-dia.webp'
import heroNight from '~/assets/hero-noche.webp'

/**
 * Hero "Bóveda".
 *
 * - Dos imágenes: hero-dia.webp (modo claro) y hero-noche.webp (modo oscuro).
 *   Van como background con variables CSS: el navegador descarga SÓLO la del
 *   modo activo. Para cambiarlas, reemplazá esos dos archivos en assets/
 *   (mismo encuadre: productos a los costados y el centro despejado).
 * - Parallax: al bajar, la imagen se mueve más lento que la página y el texto
 *   se desvanece. Se apaga con prefers-reduced-motion.
 * - Entrada: una sola cascada al cargar (60ms entre elementos, ease-out fuerte).
 */
const background = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
let frame = 0

function applyParallax() {
  frame = 0
  const y = window.scrollY
  if (y > window.innerHeight * 1.2) return
  if (background.value) background.value.style.transform = `translate3d(0, ${y * 0.42}px, 0) scale(1.06)`
  if (content.value) {
    content.value.style.transform = `translate3d(0, ${y * 0.16}px, 0)`
    content.value.style.opacity = String(Math.max(0, 1 - y / 560))
  }
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(applyParallax)
}

onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  applyParallax()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) cancelAnimationFrame(frame)
})

const facts = [
  { label: 'Envío', value: 'A todo el país por Correo Argentino, con seguimiento' },
  { label: 'Pago', value: 'Mercado Pago: tarjeta, débito o dinero en cuenta' },
  { label: 'Garantía', value: `${STORE.warrantyDays} días en todos los productos` },
]
</script>

<template>
  <section class="torox-hero relative isolate overflow-hidden bg-slate-100 dark:bg-dark-950">
    <!-- Imagen día / noche con parallax -->
    <div
      ref="background"
      class="hero-bg absolute inset-0 -z-20 origin-top will-change-transform"
      :style="{ '--hero-day': `url(${heroDay})`, '--hero-night': `url(${heroNight})` }"
    />
    <!-- Velo: despeja el centro para el texto y funde la base con la página -->
    <div class="hero-veil absolute inset-0 -z-10" />

    <div
      ref="content"
      class="container-torox relative flex min-h-[600px] flex-col items-center justify-center pb-14 pt-20 text-center sm:min-h-[660px] lg:min-h-[min(80vh,760px)]"
    >
      <p class="hero-in label-brass !text-sm underline decoration-brass-500/60 decoration-1 underline-offset-[8px] sm:!text-base">
        Seguridad inteligente para tu mundo
      </p>

      <h1 class="hero-in hero-in-2 font-display mt-7 text-slate-900 dark:text-white">
        <span class="block text-[2.15rem] [text-wrap:balance] sm:text-6xl lg:text-[4.6rem]">Cámaras y cerraduras</span>
        <span class="hero-shine text-gradient-torox block pb-1 text-[2.85rem] leading-[0.95] sm:text-[5.6rem] lg:text-[7.4rem]">
          inteligentes
        </span>
      </h1>

      <p class="hero-in hero-in-3 mt-7 max-w-lg text-lg text-slate-700 [text-wrap:pretty] dark:text-slate-200 sm:text-xl">
        Para tu casa y tu negocio. Las manejás desde el celular y te asesoramos por WhatsApp antes y después de comprar.
      </p>

      <div class="hero-in hero-in-4 mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
        <NuxtLink to="/productos" class="btn-primary w-full !px-8 !py-4 !text-base sm:w-auto">
          Ver productos
        </NuxtLink>
        <a
          :href="whatsappLink('Hola! Quiero que me asesoren para elegir un producto.')"
          target="_blank"
          rel="noopener noreferrer"
          class="btn w-full border border-slate-900/20 bg-[rgba(255,255,255,0.6)] px-8 py-4 text-base text-slate-900 backdrop-blur hover:border-slate-900/50 hover:bg-[rgba(255,255,255,0.85)] dark:border-white/25 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/50 dark:hover:bg-white/10 sm:w-auto"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-[#1fae55] dark:text-[#25D366]" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41Z" />
          </svg>
          Consultar por WhatsApp
        </a>
      </div>
    </div>

    <!-- Ficha técnica: los tres datos que dan confianza, separados por hilos de latón -->
    <dl class="container-torox relative grid pb-8 sm:grid-cols-3 sm:gap-8 sm:pb-10">
      <div v-for="fact in facts" :key="fact.label" class="rule-brass border-t py-4 text-left sm:py-5">
        <dt class="label-brass">{{ fact.label }}</dt>
        <dd class="mt-1.5 text-[0.95rem] font-medium text-slate-800 dark:text-slate-200">{{ fact.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<style>
/* Sin scoped: estas reglas dependen de la clase .dark del <html>. */
.torox-hero .hero-bg {
  background-image: var(--hero-day);
  background-size: cover;
  background-position: 84% center;
  transform: scale(1.06);
}
.dark .torox-hero .hero-bg {
  background-image: var(--hero-night);
}
@media (min-width: 768px) {
  .torox-hero .hero-bg { background-position: center; }
}

/* Velo claro (día) */
.torox-hero .hero-veil {
  background:
    linear-gradient(to bottom, transparent 55%, rgb(236 238 240) 100%),
    rgba(236, 238, 240, 0.72);
}
@media (min-width: 768px) {
  .torox-hero .hero-veil {
    background:
      linear-gradient(to bottom, transparent 62%, rgb(236 238 240) 100%),
      radial-gradient(ellipse 42% 62% at 50% 44%, rgba(236, 238, 240, 0.9) 0%, rgba(236, 238, 240, 0.55) 60%, rgba(236, 238, 240, 0) 100%);
  }
}
/* Velo oscuro (noche) */
.dark .torox-hero .hero-veil {
  background:
    linear-gradient(to bottom, transparent 55%, rgb(10 11 13) 100%),
    rgba(10, 11, 13, 0.62);
}
@media (min-width: 768px) {
  .dark .torox-hero .hero-veil {
    background:
      linear-gradient(to bottom, transparent 62%, rgb(10 11 13) 100%),
      radial-gradient(ellipse 42% 62% at 50% 44%, rgba(10, 11, 13, 0.86) 0%, rgba(10, 11, 13, 0.5) 60%, rgba(10, 11, 13, 0) 100%);
  }
}

</style>

<style scoped>
/* Entrada única al cargar: cascada de 60ms, ease-out fuerte, sin scale(0). */
.hero-in {
  animation: hero-in 0.7s cubic-bezier(0.23, 1, 0.32, 1) both;
}
.hero-in-2 { animation-delay: 0.06s; }
.hero-in-3 { animation-delay: 0.12s; }
.hero-in-4 { animation-delay: 0.18s; }
@keyframes hero-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Un reflejo de luz recorre "inteligentes" una vez, como metal pulido. */
.hero-shine {
  background-size: 220% 100%;
  animation: hero-shine 2.2s cubic-bezier(0.23, 1, 0.32, 1) 0.35s both;
}
@keyframes hero-shine {
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-in { animation-name: hero-fade; }
  @keyframes hero-fade { from { opacity: 0; } }
}
</style>
