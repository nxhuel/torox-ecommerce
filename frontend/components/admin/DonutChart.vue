<script setup lang="ts">
const props = defineProps<{
  data: { label: string; value: number; color: string }[]
}>()

const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))

const circumference = 2 * Math.PI * 42

const segments = computed(() => {
  let offset = 0
  return props.data.map((d) => {
    const fraction = total.value ? d.value / total.value : 0
    const seg = {
      ...d,
      dash: `${fraction * circumference} ${circumference}`,
      offset,
    }
    offset -= fraction * circumference
    return seg
  })
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
    <svg viewBox="0 0 100 100" class="h-40 w-40 -rotate-90">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" stroke-width="12" />
      <circle
        v-for="seg in segments"
        :key="seg.label"
        cx="50"
        cy="50"
        r="42"
        fill="none"
        :stroke="seg.color"
        stroke-width="12"
        stroke-dasharray="seg.dash"
        stroke-dashoffset="seg.offset"
        stroke-linecap="butt"
      />
    </svg>
    <div class="w-full space-y-2">
      <div v-for="seg in segments" :key="seg.label" class="flex items-center gap-2 text-sm">
        <span class="h-3 w-3 rounded-sm" :style="{ background: seg.color }" />
        <span class="flex-1 font-medium text-slate-700">{{ seg.label }}</span>
        <span class="font-bold text-slate-900">{{ seg.value }}</span>
      </div>
    </div>
  </div>
</template>