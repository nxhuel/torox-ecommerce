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

function fallback() {
  if (props.seed) {
    current.value = `https://picsum.photos/seed/${encodeURIComponent(props.seed)}/600/600`
  } else {
    current.value = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b416d"/><stop offset="100%" stop-color="#0891b2"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><text x="50%" y="50%" font-family="Inter,Arial" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${props.alt || 'TOROX'}</text></svg>`,
    )}`
  }
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
    class="object-cover"
    @error="fallback"
  />
</template>