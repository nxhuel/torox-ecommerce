<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { Product } from '~/types'
import { favoritesService } from '~/services'

definePageMeta({ layout: 'account', middleware: 'auth' })

const favorites = ref<Product[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    favorites.value = await favoritesService.all()
  } finally {
    loading.value = false
  }
})

async function remove(productId: string) {
  await favoritesService.toggle(productId)
  favorites.value = favorites.value.filter((p) => p.id !== productId)
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-slate-900">Mis favoritos</h1>

    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <BaseSkeleton v-for="i in 6" :key="i" class="aspect-[3/4] !rounded-xl" />
    </div>

    <div v-else-if="favorites.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <ProductCard
        v-for="product in favorites"
        :key="product.id"
        :product="product"
        @favorite-removed="remove(product.id)"
      />
    </div>

    <EmptyState
      v-else
      icon="heart"
      title="No tenés favoritos todavía"
      description="Tocá el corazón en cualquier producto para guardarlo acá."
    >
      <NuxtLink to="/productos" class="btn-primary">
        Explorar productos <ArrowRight class="h-4 w-4" />
      </NuxtLink>
    </EmptyState>
  </div>
</template>