<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from '#imports'
import { Lock, Mail, ArrowLeft, Loader2 } from 'lucide-vue-next'
import logo from '~/assets/logo.png'
import authImg from '~/assets/fondo-auth.png'
import { useToast } from '~/composables/useToast'
import { authService } from '~/services'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const token = ref('')
const submitted = ref(false)

onMounted(() => {
  token.value = String(route.query.token || '')
  if (!token.value) {
    router.push('/auth/login')
  }
})

async function submit() {
  error.value = ''
  if (!password.value) {
    error.value = 'Completá tu nueva contraseña.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  loading.value = true
  try {
    await authService.resetPassword(token.value, password.value)
    submitted.value = true
    toast.success('¡Contraseña actualizada!')
    setTimeout(() => router.push('/auth/login'), 2000)
  } catch (err: any) {
    const msg = err?.data?.message || err.message || 'Error al restablecer la contraseña'
    error.value = msg
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
        <h1 class="text-3xl font-bold text-slate-900">Nueva contraseña</h1>
        <p class="mt-2 text-slate-500">Elegí una nueva contraseña para tu cuenta</p>

        <!-- Error -->
        <p v-if="error && !submitted"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <!-- Success -->
        <div v-if="submitted"
          class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✅ ¡Tu contraseña fue actualizada! Redirigiendo...
        </div>

        <!-- Form -->
        <form v-if="!submitted" class="mt-8 space-y-4" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="password">Nueva contraseña</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="password" v-model="password" type="password" class="input-base !py-3 !pl-11"
                placeholder="Mínimo 8 caracteres" />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="confirmPassword">Confirmar contraseña</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="confirmPassword" v-model="confirmPassword" type="password" class="input-base !py-3 !pl-11"
                placeholder="Repetí la contraseña" />
            </div>
          </div>

          <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
            <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
            Actualizar contraseña
          </button>
        </form>

        <!-- Back -->
        <div class="mt-8 text-center">
          <NuxtLink to="/auth/login" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft class="h-4 w-4" /> Volver al inicio de sesión
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Right: Branding panel -->
    <div class="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-dark-900 lg:flex">
      <img :src="authImg" alt="TOROX Seguridad" class="absolute inset-0 h-full w-full object-cover" />
    </div>
  </div>
</template>
