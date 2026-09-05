<script setup lang="ts">
import { ORDER_STATUS_STYLES } from '~/composables/useFormat'

const props = defineProps<{
  label: string
  status: string
}>()

const style = computed(() => ORDER_STATUS_STYLES[props.status] || 'bg-slate-100 text-slate-600 border-slate-200')
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
    :class="style"
  >
    <span class="h-1.5 w-1.5 rounded-full bg-current" />
    {{ label }}
  </span>
</template>