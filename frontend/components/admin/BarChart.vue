<script setup lang="ts">
const props = defineProps<{
  data: { label: string; value: number }[]
  color?: string
  format?: (value: number) => string
}>()

const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)))
</script>

<template>
  <div v-if="data.length" class="flex h-56 items-end gap-2 sm:gap-3">
    <div
      v-for="(item, index) in data"
      :key="index"
      class="group flex flex-1 flex-col items-center gap-2"
    >
      <span class="text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
        {{ format ? format(item.value) : item.value }}
      </span>
      <div
        class="w-full rounded-t-lg transition-all duration-500"
        :class="color || 'bg-brand-500'"
        :style="{ height: `${Math.max(2, (item.value / max) * 100)}%` }"
      />
      <span class="text-[11px] font-medium text-slate-500">{{ item.label }}</span>
    </div>
  </div>
  <p v-else class="py-10 text-center text-sm text-slate-400">Sin datos para mostrar</p>
</template>