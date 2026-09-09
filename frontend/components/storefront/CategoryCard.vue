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
    class="group flex flex-col overflow-hidden rounded-xl bg-dark-800 shadow-card ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-white/20"
  >
    <div class="relative aspect-[4/3] overflow-hidden !bg-white">
      <AppImage
        :src="category.imageUrl"
        :alt="category.name"
        :seed="category.slug"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="flex flex-1 flex-col items-center gap-1 p-4 text-center">
      <span class="text-sm font-bold text-white">{{ category.name }}</span>
      <span
        v-if="category.children?.length"
        class="text-xs font-semibold text-slate-400"
      >
        {{ category.children.length }} subcategorías
      </span>
      <span class="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-bold text-brand-400 transition-all group-hover:gap-2.5">
        Ver productos <ArrowRight class="h-3.5 w-3.5" />
      </span>
    </div>
  </NuxtLink>
</template>