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
    <div class="flex items-center gap-4">
      <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <UserCircle class="h-9 w-9" />
      </span>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          {{ auth.user?.firstName }} {{ auth.user?.lastName }}
        </h1>
        <p class="flex items-center gap-1.5 text-sm text-slate-500">
          <Mail class="h-3.5 w-3.5" /> {{ auth.user?.email }}
          <span v-if="auth.user?.phone" class="ml-2 flex items-center gap-1">
            <Phone class="h-3.5 w-3.5" /> {{ auth.user.phone }}
          </span>
        </p>
      </div>
    </div>

    <div class="card p-6">
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

    <div class="card p-6">
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