<script setup lang="ts">
import { User, Package, Heart, Bell, MapPin } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useNotificationsStore } from '~/stores/notifications'

const auth = useAuthStore()
const cart = useCartStore()
const notifications = useNotificationsStore()
const route = useRoute()

onMounted(() => {
  auth.init()
  cart.init()
  if (auth.isAuthenticated) notifications.load()
})

const links = [
  { to: '/cuenta/perfil', label: 'Mi perfil', icon: User },
  { to: '/cuenta/compras', label: 'Mis compras', icon: Package },
  { to: '/cuenta/favoritos', label: 'Mis favoritos', icon: Heart },
  { to: '/cuenta/notificaciones', label: 'Notificaciones', icon: Bell, badge: () => notifications.unread },
  { to: '/cuenta/direcciones', label: 'Direcciones', icon: MapPin },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar />
    <main class="container-torox flex-1 py-8">
      <div class="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside class="lg:sticky lg:top-24 lg:self-start">
          <div class="mb-4 flex items-center gap-3 px-2">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-500 font-bold text-white">
              {{ auth.user?.firstName?.[0] }}{{ auth.user?.lastName?.[0] }}
            </span>
            <div class="leading-tight">
              <p class="text-sm font-bold text-slate-900">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
              <p class="text-xs text-slate-400">Cliente</p>
            </div>
          </div>
          <nav class="flex gap-1 overflow-x-auto lg:flex-col">
            <NuxtLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition"
              :class="isActive(link.to) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'"
            >
              <component :is="link.icon" class="h-4.5 w-4.5" />
              {{ link.label }}
              <span
                v-if="link.badge && link.badge() > 0"
                class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white"
              >
                {{ link.badge() }}
              </span>
            </NuxtLink>
          </nav>
        </aside>
        <div>
          <slot />
        </div>
      </div>
    </main>
    <AppFooter />
    <ToastWidget />
  </div>
</template>