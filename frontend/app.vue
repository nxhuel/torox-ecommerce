<script setup lang="ts">
import { useToast } from '~/composables/useToast'

useToast()
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>