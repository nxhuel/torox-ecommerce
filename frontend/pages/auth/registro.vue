<script setup lang="ts">
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-vue-next'
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

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const showTerminos = ref(false)
const showPrivacidad = ref(false)

const redirect = computed(() => String(route.query.redirect || '/'))

async function submit() {
  error.value = ''
  if (!form.firstName || !form.lastName || !form.email || !form.password) {
    error.value = 'Completá todos los campos obligatorios.'
    return
  }
  if (form.password.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (form.password !== form.confirmPassword) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  loading.value = true
  try {
    await auth.register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    })
    await Promise.all([cart.init(), notifications.load()])
    toast.success('¡Tu cuenta fue creada con éxito!')
    router.push(redirect.value)
  } catch (err: any) {
    error.value = err.message || 'No se pudo crear la cuenta'
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
        <div class="mb-8 text-center lg:text-left">
          <img :src="logo" alt="TOROX" class="mx-auto mb-2 h-12 w-auto object-contain lg:mx-0" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-slate-900">Creá tu cuenta</h1>
        <p class="mt-2 text-slate-500">Comenzá a proteger tu espacio</p>

        <!-- Error -->
        <p v-if="error"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <!-- Form -->
        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700" for="firstName">Nombre *</label>
              <div class="relative">
                <User class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input id="firstName" v-model="form.firstName" class="input-base !py-3 !pl-11" placeholder="Juan" />
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700" for="lastName">Apellido *</label>
              <input id="lastName" v-model="form.lastName" class="input-base !py-3" placeholder="Pérez" />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="email">Email *</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="email" v-model="form.email" type="email" class="input-base !py-3 !pl-11"
                placeholder="tu@email.com" />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="phone">Teléfono</label>
            <div class="relative">
              <Phone class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="phone" v-model="form.phone" class="input-base !py-3 !pl-11" placeholder="+54 11 5555-1234" />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="password">Contraseña *</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                class="input-base !py-3 !pl-11 !pr-11" placeholder="Mínimo 8 caracteres" />
              <button type="button"
                class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                @click="showPassword = !showPassword">
                <Eye v-if="!showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="confirmPassword">Confirmar contraseña
              *</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="confirmPassword" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'"
                class="input-base !py-3 !pl-11" placeholder="Repetí la contraseña" />
            </div>
          </div>

          <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
            <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
            Crear cuenta
          </button>
        </form>

        <!-- Login link -->
        <p class="mt-6 text-center text-sm text-slate-600">
          Ya tengo cuenta,
          <NuxtLink to="/auth/login" class="font-semibold text-brand-600 hover:text-brand-700">
            ingresar
          </NuxtLink>
        </p>

        <!-- Terms -->
        <p class="mt-4 text-center text-xs text-slate-400">
          Al crear una cuenta en TOROX aceptás los
          <button type="button" class="underline hover:text-slate-600" @click="showTerminos = true">Términos</button>
          y la
          <button type="button" class="underline hover:text-slate-600" @click="showPrivacidad = true">Política de
            Privacidad</button>.
        </p>

        <!-- Back -->
        <div class="mt-6 text-center">
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
