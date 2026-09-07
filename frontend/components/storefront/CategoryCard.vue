<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { Category } from '~/types'

defineProps<{
  category: Category
}>()
</script>

<template>
  <NuxtLink
    :to="`/productos?categoryId=${category.id}`"
    class="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:ring-2 hover:ring-brand-400/60"
  >
    <AppImage
      :src="category.imageUrl"
      :alt="category.name"
      :seed="category.slug"
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
    />
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    <div class="relative mt-auto p-5">
      <span class="inline-block rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-dark-800 shadow-sm backdrop-blur">
        {{ category.name }}
      </span>
      <span
        v-if="category.children?.length"
        class="mt-1 block text-xs font-semibold text-white drop-shadow-md"
      >
        {{ category.children.length }} categorías
      </span>
      <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-white drop-shadow-md transition-all group-hover:gap-2.5">
        Ver productos <ArrowRight class="h-4 w-4" />
      </span>
    </div>
  </NuxtLink>
</template>