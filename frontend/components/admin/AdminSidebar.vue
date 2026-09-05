<script setup lang="ts">
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ClipboardList,
  Users,
  Tag,
  Wallet,
  Bell,
  X,
  Store,
} from 'lucide-vue-next'
import logo from '~/assets/logo.png'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/promociones', label: 'Promociones', icon: Tag },
  { to: '/admin/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
]

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin' || route.path === '/admin/'
  return route.path.startsWith(path)
}
</script>

<template>
  <!-- Desktop -->
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-dark-800 lg:flex">
    <div class="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
      <img :src="logo" alt="TOROX" class="h-9 w-9 object-contain" />
      <div>
        <p class="text-base font-black text-white leading-none">TOROX</p>
        <p class="text-[11px] text-slate-400 leading-tight">Panel administrativo</p>
      </div>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
        :class="isActive(link.to) ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
      >
        <component :is="link.icon" class="h-4.5 w-4.5" />
        {{ link.label }}
      </NuxtLink>
    </nav>

    <div class="border-t border-white/10 p-3">
      <NuxtLink
        to="/"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        <Store class="h-4.5 w-4.5" />
        Ver la tienda
      </NuxtLink>
    </div>
  </aside>

  <!-- Mobile -->
  <Transition name="dropdown">
    <div v-if="open" class="fixed inset-0 z-50 lg:hidden">
      <div class="absolute inset-0 bg-dark-900/60" @click="emit('close')" />
      <aside class="absolute inset-y-0 left-0 flex w-72 flex-col bg-dark-800">
        <div class="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div class="flex items-center gap-2.5">
            <img :src="logo" alt="TOROX" class="h-9 w-9 object-contain" />
            <div>
              <p class="text-base font-black text-white leading-none">TOROX</p>
              <p class="text-[11px] text-slate-400 leading-tight">Panel admin</p>
            </div>
          </div>
          <button class="rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Cerrar" @click="emit('close')">
            <X class="h-5 w-5" />
          </button>
        </div>
        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="isActive(link.to) ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
          >
            <component :is="link.icon" class="h-4.5 w-4.5" />
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="border-t border-white/10 p-3">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            <Store class="h-4.5 w-4.5" />
            Ver la tienda
          </NuxtLink>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}
</style>