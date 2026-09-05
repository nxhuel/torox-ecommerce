<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  value: string
  icon: Component
  accent?: 'brand' | 'emerald' | 'amber' | 'red' | 'indigo'
  hint?: string
}>()

const accents = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
}
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{{ value }}</p>
        <p v-if="hint" class="mt-1 text-xs text-slate-400">{{ hint }}</p>
      </div>
      <span class="flex h-11 w-11 items-center justify-center rounded-xl" :class="accents[accent || 'brand']">
        <component :is="icon" class="h-5.5 w-5.5" />
      </span>
    </div>
  </div>
</template>