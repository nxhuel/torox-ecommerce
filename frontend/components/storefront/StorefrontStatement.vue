<script setup lang="ts">
/**
 * Momento tipográfico de la home: tres frases grandes sobre obsidiana.
 * Las palabras se "encienden" a medida que la sección entra en pantalla
 * (CSS scroll-driven animations: sin JavaScript, corre en el compositor).
 * En navegadores sin soporte, o con movimiento reducido, se ven completas.
 */
const lines = [
  ['Mirá', 'tu', 'casa', 'desde', 'el', 'trabajo.'],
  ['Abrí', 'la', 'puerta', 'sin', 'llaves.'],
  ['Dormí', 'tranquilo.'],
]
const total = lines.flat().length
let index = 0
const words = lines.map((line) => line.map((text) => ({ text, i: index++ })))
</script>

<template>
  <section class="statement relative overflow-hidden bg-[#0d0e10] py-24 text-white lg:py-36">
    <div class="container-torox">
      <p class="font-display max-w-5xl text-[2.1rem] leading-[1.08] sm:text-6xl lg:text-[4.75rem]">
        <template v-for="(line, li) in words" :key="li">
          <span class="block">
            <template v-for="word in line" :key="word.i">
              <span
                class="word"
                :class="li === words.length - 1 ? 'text-gradient-torox' : ''"
                :style="{ '--start': `${(word.i / total) * 55}%`, '--end': `${(word.i / total) * 55 + 18}%` }"
              >{{ word.text }}</span>{{ ' ' }}
            </template>
          </span>
        </template>
      </p>
      <div class="mt-12 flex flex-col gap-4 border-t border-brass-500/30 pt-6 text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <p class="max-w-md">Cámaras, cerraduras y accesorios que se manejan desde una app en tu celular.</p>
        <NuxtLink to="/productos" class="btn-primary self-start !px-6 !py-3 sm:self-auto">Elegir mi equipo</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Hilo de luz azul muy tenue arriba: separa la banda de la sección anterior. */
.statement::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(47, 111, 235, 0.6), transparent);
}

/* La banda es oscura en los dos modos: usa siempre el latón claro. */
.statement .text-gradient-torox {
  background-image: linear-gradient(100deg, #b8955a 0%, #e6cf9c 45%, #f4e6c4 55%, #c8a76a 100%);
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .word {
      animation: word-on linear both;
      animation-timeline: view();
      animation-range: cover var(--start) cover var(--end);
    }
  }
}
@keyframes word-on {
  from { opacity: 0.16; }
  to { opacity: 1; }
}
</style>
