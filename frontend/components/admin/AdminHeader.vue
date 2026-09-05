<script setup lang="ts">
import { Menu, LogOut, UserCircle } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

defineProps<{
  title: string
}>()

const emit = defineEmits<{ menu: [] }>()

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/auth/login')
}
</script>

<template>
  <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
    <div class="flex items-center gap-3">
      <button
        class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
        @click="emit('menu')"
      >
        <Menu class="h-5 w-5" />
      </button>
      <h1 class="text-lg font-bold text-slate-900">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-3">
      <div class="hidden items-center gap-2.5 sm:flex">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UserCircle class="h-5 w-5" />
        </span>
        <div class="leading-tight">
          <p class="text-sm font-semibold text-slate-800">{{ auth.user?.firstName }} {{ auth.user?.lastName }}</p>
          <p class="text-xs text-slate-400">Administrador</p>
        </div>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:text-red-600"
        @click="logout"
      >
        <LogOut class="h-4 w-4" />
        <span class="hidden sm:inline">Salir</span>
      </button>
    </div>
  </header>
</template>