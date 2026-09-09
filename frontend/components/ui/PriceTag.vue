<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'

const props = withDefaults(
  defineProps<{
    price: number
    originalPrice?: number | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { originalPrice: null, size: 'md' },
)

const { currency } = useFormat()

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return { price: 'text-base', original: 'text-xs' }
    case 'lg':
      return { price: 'text-3xl', original: 'text-base' }
    default:
      return { price: 'text-xl', original: 'text-sm' }
  }
})

const discount = computed(() => {
  if (!props.originalPrice || props.originalPrice <= props.price) return null
  return Math.round(((props.originalPrice - props.price) / props.originalPrice) * 100)
})
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <span class="font-extrabold text-slate-900" :class="sizeClasses.price">
      {{ currency(price) }}
    </span>
    <span
      v-if="discount"
      class="font-medium text-slate-400 line-through"
      :class="sizeClasses.original"
    >
      {{ currency(originalPrice) }}
    </span>
    <span
      v-if="discount"
      class="rounded bg-green-50 px-1.5 py-0.5 text-xs font-bold text-green-600"
    >
      {{ discount }}% OFF
    </span>
  </div>
</template>