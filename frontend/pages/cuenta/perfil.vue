<script setup lang="ts">
import { UserCircle, Save, Loader2, Mail, Phone } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { usersService } from '~/services'

definePageMeta({ layout: 'account', middleware: 'auth' })

const auth = useAuthStore()
const toast = useToast()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
})
const password = reactive({ current: '', next: '', confirm: '' })
const loading = ref(false)

onMounted(async () => {
  auth.init()
  await auth.refreshProfile()
  if (auth.user) {
    form.firstName = auth.user.firstName
    form.lastName = auth.user.lastName
    form.email = auth.user.email
    form.phone = auth.user.phone || ''
  }
})

async function save() {
  loading.value = true
  try {
    await usersService.updateMe({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
    })
    await auth.refreshProfile()
    toast.success('Perfil actualizado')
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

async function changePassword() {
  if (password.next.length < 8) {
    toast.error('La contraseña debe tener al menos 8 caracteres')
    return
  }
  if (password.next !== password.confirm) {
    toast.error('Las contraseñas no coinciden')
    return
  }
  loading.value = true
  try {
    await usersService.updateMe({ password: password.next })
    password.current = ''
    password.next = ''
    password.confirm = ''
    toast.success('Contraseña actualizada')
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3 sm:gap-4">
      <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:h-16 sm:w-16">
        <UserCircle class="h-8 w-8 sm:h-9 sm:w-9" />
      </span>
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-slate-900 sm:text-2xl">
          {{ auth.user?.firstName }} {{ auth.user?.lastName }}
        </h1>
        <p class="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
          <span class="inline-flex min-w-0 items-center gap-1.5">
            <Mail class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ auth.user?.email }}</span>
          </span>
          <span v-if="auth.user?.phone" class="inline-flex items-center gap-1">
            <Phone class="h-3.5 w-3.5" /> {{ auth.user.phone }}
          </span>
        </p>
      </div>
    </div>

    <div class="card p-4 sm:p-6">
      <h2 class="mb-5 text-lg font-bold text-slate-900">Datos personales</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label-base" for="firstName">Nombre</label>
          <input id="firstName" v-model="form.firstName" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="lastName">Apellido</label>
          <input id="lastName" v-model="form.lastName" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="email">Email</label>
          <input id="email" v-model="form.email" type="email" class="input-base" />
        </div>
        <div>
          <label class="label-base" for="phone">Teléfono</label>
          <input id="phone" v-model="form.phone" class="input-base" />
        </div>
      </div>
      <div class="mt-5 flex justify-end">
        <button class="btn-primary" :disabled="loading" @click="save">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Guardar cambios
        </button>
      </div>
    </div>

    <div class="card p-4 sm:p-6">
      <h2 class="mb-5 text-lg font-bold text-slate-900">Cambiar contraseña</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label class="label-base" for="next">Nueva contraseña</label>
          <input id="next" v-model="password.next" type="password" class="input-base" placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label class="label-base" for="confirm">Confirmar</label>
          <input id="confirm" v-model="password.confirm" type="password" class="input-base" />
        </div>
      </div>
      <div class="mt-5 flex justify-end">
        <button class="btn-secondary" :disabled="loading" @click="changePassword">Actualizar contraseña</button>
      </div>
    </div>
  </div>
</template>