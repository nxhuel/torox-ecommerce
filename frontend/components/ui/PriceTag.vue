<script setup lang="ts">
import { useFormat } from '~/composables/useFormat'

const props = withDefaults(
  defineProps<{
    /** Price the customer pays (already discounted when applicable). */
    price: number
    /** List price, shown crossed out when it is higher than `price`. */
    originalPrice?: number | null
    /** Real discount percentage, rendered as-is (e.g. 21,95% OFF). */
    discountPercentage?: number | null
    size?: 'sm' | 'md' | 'lg'
    /** Oculta la etiqueta "% OFF" (cuando la tarjeta ya la muestra sobre la foto). */
    hideBadge?: boolean
  }>(),
  { originalPrice: null, discountPercentage: null, size: 'md', hideBadge: false },
)

const { currency, percentage } = useFormat()

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

const hasDiscount = computed(
  () => props.originalPrice != null && props.originalPrice > props.price,
)

const discountLabel = computed(() => {
  if (!hasDiscount.value) return null
  const pct =
    props.discountPercentage != null && props.discountPercentage > 0
      ? Number(props.discountPercentage)
      : ((Number(props.originalPrice) - props.price) / Number(props.originalPrice)) * 100
  return `${percentage(pct)}% OFF`
})
</script>

<template>
  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <span class="font-display tabular-nums text-slate-900" :class="sizeClasses.price">
      {{ currency(price) }}
    </span>
    <span
      v-if="hasDiscount"
      class="font-medium text-slate-400 line-through"
      :class="sizeClasses.original"
    >
      {{ currency(originalPrice) }}
    </span>
    <span
      v-if="discountLabel && !hideBadge"
      class="rounded bg-signal px-1.5 py-0.5 text-xs font-bold text-dark-900"
    >
      {{ discountLabel }}
    </span>
  </div>
</template>
