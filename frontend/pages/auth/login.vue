<script setup lang="ts">
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-vue-next'
import logo from '~/assets/logo.png'
import authImg from '~/assets/fondo-auth.png'
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
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const showTerminos = ref(false)
const showPrivacidad = ref(false)

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
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Left: Form -->
    <div class="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
      <div class="mx-auto w-full max-w-md">
        <!-- Logo -->
        <div class="mb-10 text-center lg:text-left">
          <img :src="logo" alt="TOROX" class="mx-auto mb-2 h-12 w-auto object-contain lg:mx-0" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-slate-900">Ingresá a TOROX</h1>
        <p class="mt-2 text-slate-500">Bienvenido de nuevo</p>

        <!-- Error -->
        <p v-if="error"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <!-- Form -->
        <form class="mt-8 space-y-5" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="email">Email</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="email" v-model="email" type="email" class="input-base !py-3 !pl-11" placeholder="tu@email.com"
                autocomplete="email" />
            </div>
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700" for="password">Contraseña</label>
              <NuxtLink to="/auth/recuperar" class="text-sm font-medium text-brand-600 hover:text-brand-700">
                ¿Olvidaste tu contraseña?
              </NuxtLink>
            </div>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                class="input-base !py-3 !pl-11 !pr-11" placeholder="••••••••" autocomplete="current-password" />
              <button type="button"
                class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="showPassword = !showPassword">
                <Eye v-if="!showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
            <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
            Ingresar
          </button>
        </form>

        <!-- Register link -->
        <p class="mt-6 text-center text-sm text-slate-600">
          No tengo cuenta,
          <NuxtLink to="/auth/registro" class="font-semibold text-brand-600 hover:text-brand-700">
            registrarme
          </NuxtLink>
        </p>

        <!-- Terms -->
        <p class="mt-6 text-center text-xs text-slate-400">
          Al utilizar una cuenta en TOROX aceptás los
          <button type="button" class="underline hover:text-slate-600" @click="showTerminos = true">Términos</button>
          y la
          <button type="button" class="underline hover:text-slate-600" @click="showPrivacidad = true">Política de
            Privacidad</button>.
        </p>

        <!-- Back -->
        <div class="mt-8 text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft class="h-4 w-4" /> Volver al inicio
          </NuxtLink>
        </div>
      </div>
    </div>
    <!-- Right: Branding panel -->
    <div
      class="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-dark-900 lg:flex">
      <img :src="authImg" alt="TOROX Seguridad" class="absolute inset-0 h-full w-full object-cover" />
    </div>

    <!-- Modals -->
    <AppModal :open="showTerminos" title="Términos y Condiciones" @close="showTerminos = false">
      <TerminosContent />
    </AppModal>
    <AppModal :open="showPrivacidad" title="Política de Privacidad" @close="showPrivacidad = false">
      <PrivacidadContent />
    </AppModal>
  </div>
</template>
