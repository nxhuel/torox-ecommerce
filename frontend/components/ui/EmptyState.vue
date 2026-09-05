<script setup lang="ts">
import { Package, Heart, ShoppingCart, Bell, Inbox, SearchX } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  { icon: 'package', description: '' },
)

const icons: Record<string, Component> = {
  package: Package,
  heart: Heart,
  cart: ShoppingCart,
  bell: Bell,
  inbox: Inbox,
  search: SearchX,
}
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <component :is="icons[icon] || Package" class="h-8 w-8" />
    </div>
    <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500">
      {{ description }}
    </p>
    <div class="mt-6">
      <slot />
    </div>
  </div>
</template>