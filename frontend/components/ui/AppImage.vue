<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    seed?: string
    loading?: 'lazy' | 'eager'
  }>(),
  { src: null, alt: '', seed: '', loading: 'lazy' },
)

const current = ref(props.src || '')

/**
 * Si la imagen no carga mostramos un placeholder de marca. Antes se usaba una
 * foto aleatoria de picsum.photos, que en una tienda real muestra cualquier
 * cosa (paisajes, gente) en lugar del producto.
 */
function fallback() {
  const label = (props.alt || 'TOROX').slice(0, 40).replace(/[<>&"]/g, '')
  current.value = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#f2f5fa"/><path d="M300 210l70 28v58c0 46-30 82-70 96-40-14-70-50-70-96v-58z" fill="none" stroke="#9cc3ff" stroke-width="10" stroke-linejoin="round"/><text x="50%" y="470" font-family="Archivo,Arial" font-size="22" fill="#5b6b8c" text-anchor="middle">${label}</text></svg>`,
  )}`
}

watch(
  () => props.src,
  (value) => {
    current.value = value || ''
  },
)
</script>

<template>
  <img
    :src="current"
    :alt="alt"
    :loading="loading"
    @error="fallback"
  />
</template>