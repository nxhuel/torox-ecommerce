<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useNotificationsStore } from '~/stores/notifications'

const auth = useAuthStore()
const cart = useCartStore()
const notifications = useNotificationsStore()

onMounted(() => {
  auth.init()
  cart.init()
  if (auth.isAuthenticated) notifications.load()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <ToastWidget />
  </div>
</template>