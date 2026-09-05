<script setup lang="ts">
import { UserPlus, Loader2 } from 'lucide-vue-next'
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

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const error = ref('')

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
  <div class="flex min-h-[80vh] items-center justify-center py-12">
    <div class="w-full max-w-md">
      <div class="card p-8">
        <div class="mb-6 text-center">
          <img :src="logo" alt="TOROX" class="mx-auto mb-4 h-14 w-14 object-contain" />
          <h1 class="text-2xl font-bold text-slate-900">Creá tu cuenta</h1>
          <p class="mt-1 text-sm text-slate-500">Guardá tus compras, favoritos y recibí ofertas</p>
        </div>

        <p v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <form class="space-y-4" @submit.prevent="submit">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-base" for="firstName">Nombre *</label>
              <input id="firstName" v-model="form.firstName" class="input-base" placeholder="Juan" />
            </div>
            <div>
              <label class="label-base" for="lastName">Apellido *</label>
              <input id="lastName" v-model="form.lastName" class="input-base" placeholder="Pérez" />
            </div>
          </div>
          <div>
            <label class="label-base" for="email">Email *</label>
            <input id="email" v-model="form.email" type="email" class="input-base" placeholder="tu@email.com" />
          </div>
          <div>
            <label class="label-base" for="phone">Teléfono</label>
            <input id="phone" v-model="form.phone" class="input-base" placeholder="+54 11 5555-1234" />
          </div>
          <div>
            <label class="label-base" for="password">Contraseña *</label>
            <input id="password" v-model="form.password" type="password" class="input-base" placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label class="label-base" for="confirmPassword">Confirmar contraseña *</label>
            <input id="confirmPassword" v-model="form.confirmPassword" type="password" class="input-base" placeholder="Repetí la contraseña" />
          </div>
          <button class="btn-primary w-full !py-3" :disabled="loading">
            <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
            <UserPlus v-else class="h-4 w-4" />
            Crear cuenta
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?
          <NuxtLink to="/auth/login" class="font-bold text-brand-600 hover:text-brand-700">
            Ingresá
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>