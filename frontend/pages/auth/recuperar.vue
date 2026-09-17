<script setup lang="ts">
import { ref } from 'vue'
import { Mail, ArrowLeft, Loader2 } from 'lucide-vue-next'
import logo from '~/assets/logo.png'
import authImg from '~/assets/fondo-auth.png'
import { useToast } from '~/composables/useToast'
import { authService } from '~/services'

const toast = useToast()
const email = ref('')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)

async function submit() {
  error.value = ''
  if (!email.value) {
    error.value = 'Completá tu email.'
    return
  }
  loading.value = true
  try {
    await authService.forgotPassword(email.value)
    submitted.value = true
    toast.success('Te enviamos un enlace a tu correo')
  } catch (err: any) {
    const msg = err?.data?.message || err.message || 'Error al enviar el enlace'
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
        <h1 class="text-3xl font-bold text-slate-900">Recuperá tu contraseña</h1>
        <p class="mt-2 text-slate-500">Ingresá tu email y te enviaremos un enlace para restablecerla</p>

        <!-- Success -->
        <div v-if="submitted"
          class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✅ Revisá tu casilla de correo. Si la cuenta existe, recibirás un enlace para crear una nueva contraseña.
        </div>

        <!-- Error -->
        <p v-if="error && !submitted"
          class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <!-- Form -->
        <form v-if="!submitted" class="mt-8 space-y-5" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700" for="email">Email</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input id="email" v-model="email" type="email" class="input-base !py-3 !pl-11"
                placeholder="tu@email.com" autocomplete="email" />
            </div>
          </div>

          <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
            <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
            Enviar enlace
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
