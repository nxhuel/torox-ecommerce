<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    disabled?: boolean
  }>(),
  { min: 1, max: 99, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function set(value: number) {
  const next = Math.min(props.max, Math.max(props.min, value))
  emit('update:modelValue', next)
}
</script>

<template>
  <div
    class="inline-flex items-center rounded-lg border border-slate-200 bg-white"
    :class="{ 'opacity-50 pointer-events-none': disabled }"
  >
    <button
      class="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-brand-600"
      aria-label="Disminuir cantidad"
      @click="set(modelValue - 1)"
    >
      <Minus class="h-4 w-4" />
    </button>
    <span class="w-10 text-center text-sm font-semibold text-slate-800">{{ modelValue }}</span>
    <button
      class="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-brand-600"
      aria-label="Aumentar cantidad"
      @click="set(modelValue + 1)"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>
</template>