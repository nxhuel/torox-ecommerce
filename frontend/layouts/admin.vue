<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const sidebarOpen = ref(false)

onMounted(() => auth.init())

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)

const title = computed(() => {
  const path = route.path
  if (path === '/admin' || path === '/admin/') return 'Dashboard'
  const map: Record<string, string> = {
    '/admin/productos': 'Productos',
    '/admin/categorias': 'Categorías',
    '/admin/pedidos': 'Pedidos',
    '/admin/clientes': 'Clientes',
    '/admin/promociones': 'Promociones',
    '/admin/finanzas': 'Finanzas',
    '/admin/notificaciones': 'Notificaciones',
  }
  return map[path] || 'Panel administrativo'
})
</script>

<template>
  <div class="flex min-h-screen bg-slate-100">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex min-w-0 flex-1 flex-col lg:pl-64">
      <AdminHeader :title="title" @menu="sidebarOpen = true" />
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
    <ToastWidget />
  </div>
</template>