<script setup lang="ts">
import { useToast } from '~/composables/useToast'

useToast()

const theme = useTheme()
const route = useRoute()

// Dark is the default. Apply the .dark class on <html> for storefront
// routes only; /admin keeps its original light theme.
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

useHead({
  htmlAttrs: {
    class: computed(() => (theme.isDark.value && !isAdminRoute.value ? 'dark' : '')),
  },
})

onMounted(() => {
  theme.init()
})

watch(
  () => route.path,
  () => {
    if (import.meta.client) theme.syncClass()
  },
)
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
