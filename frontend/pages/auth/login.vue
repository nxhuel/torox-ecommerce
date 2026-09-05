<script setup lang="ts">
import { LogIn, Loader2 } from 'lucide-vue-next'
import logo from '~/assets/logo.png'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useNotificationsStore } from '~/stores/notifications'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const notifications = useNotificationsStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const redirect = computed(() => String(route.query.redirect || '/'))

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Completá email y contraseña.'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await Promise.all([cart.init(), notifications.load()])
    toast.success(`¡Hola de nuevo, ${auth.user?.firstName}!`)
    router.push(redirect.value)
  } catch (err: any) {
    error.value = err.message || 'Credenciales incorrectas'
  } finally {
    loading.value = false
  }
}

function fillDemo(role: 'admin' | 'customer') {
  if (role === 'admin') {
    email.value = 'admin@torox.com'
    password.value = 'Admin123!'
  } else {
    email.value = 'lucia.fernandez@example.com'
    password.value = 'Cliente123!'
  }
}
</script>

<template>
  <div class="flex min-h-[80vh] items-center justify-center py-12">
    <div class="w-full max-w-md">
      <div class="card p-8">
        <div class="mb-6 text-center">
          <img :src="logo" alt="TOROX" class="mx-auto mb-4 h-14 w-14 object-contain" />
          <h1 class="text-2xl font-bold text-slate-900">Ingresá a TOROX</h1>
          <p class="mt-1 text-sm text-slate-500">Accedé a tus compras, favoritos y ofertas</p>
        </div>

        <p v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="label-base" for="email">Email</label>
            <input id="email" v-model="email" type="email" class="input-base" placeholder="tu@email.com" autocomplete="email" />
          </div>
          <div>
            <label class="label-base" for="password">Contraseña</label>
            <input id="password" v-model="password" type="password" class="input-base" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <button class="btn-primary w-full !py-3" :disabled="loading">
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <LogIn v-else class="h-4 w-4" />
            Ingresar
          </button>
        </form>

        <div class="mt-6 rounded-lg border border-brand-100 bg-brand-50 p-4">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-brand-700">Cuentas demo</p>
          <div class="flex gap-2">
            <button class="btn-secondary flex-1 !px-3 !py-1.5 !text-xs" @click="fillDemo('admin')">
              Admin
            </button>
            <button class="btn-secondary flex-1 !px-3 !py-1.5 !text-xs" @click="fillDemo('customer')">
              Cliente
            </button>
          </div>
          <p class="mt-2 text-xs text-brand-800">
            Admin: admin@torox.com / Admin123!<br />
            Cliente: lucia.fernandez@example.com / Cliente123!
          </p>
        </div>

        <p class="mt-6 text-center text-sm text-slate-500">
          ¿No tenés cuenta?
          <NuxtLink to="/auth/registro" class="font-bold text-brand-600 hover:text-brand-700">
            Creala gratis
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>