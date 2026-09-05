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
    class="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-xl bg-dark-800 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
  >
    <AppImage
      :src="category.imageUrl"
      :alt="category.name"
      :seed="category.slug"
      class="absolute inset-0 h-full w-full opacity-60 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/40 to-transparent" />
    <div class="relative mt-auto p-5">
      <h3 class="text-lg font-bold text-white">{{ category.name }}</h3>
      <span
        v-if="category.children?.length"
        class="mt-1 block text-xs text-slate-300"
      >
        {{ category.children.length }} categorías
      </span>
      <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 transition-all group-hover:gap-2.5">
        Ver productos <ArrowRight class="h-4 w-4" />
      </span>
    </div>
  </NuxtLink>
</template>