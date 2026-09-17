<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from '#imports'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-vue-next'
import logo from '~/assets/logo.png'
import authImg from '~/assets/fondo-auth.png'
import { useToast } from '~/composables/useToast'
import { authService } from '~/services'

const router = useRouter()
const toast = useToast()

const CODE_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

type Step = 'email' | 'code' | 'password'

const step = ref<Step>('email')
const loading = ref(false)
const error = ref('')

// Step 1
const email = ref('')

// Step 2
const digits = ref<string[]>(Array(CODE_LENGTH).fill(''))
const codeInputs = ref<HTMLInputElement[]>([])
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
const code = computed(() => digits.value.join(''))

// Step 3
const resetToken = ref('')
const password = ref('')
const confirmPassword = ref('')
const done = ref(false)

const currentStep = computed(() => ({ email: 1, code: 2, password: 3 })[step.value])

const maskedEmail = computed(() => {
  const [local, domain] = email.value.split('@')
  if (!domain) return email.value
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`
})

const steps = [
  { number: 1, label: 'Tu email', icon: Mail },
  { number: 2, label: 'El código', icon: KeyRound },
  { number: 3, label: 'Nueva clave', icon: Lock },
]

/* ---------- Step 1 / resend ---------- */

async function sendCode(isResend = false) {
  error.value = ''
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = 'Ingresá un email válido.'
    return
  }

  loading.value = true
  try {
    await authService.forgotPassword(email.value)
    step.value = 'code'
    resetDigits()
    startCooldown()
    toast.success(isResend ? 'Te reenviamos el código' : 'Te enviamos un código a tu correo')
    await nextTick()
    codeInputs.value[0]?.focus()
  } catch (err: any) {
    error.value = err?.message || 'No pudimos enviar el código. Intentá de nuevo.'
  } finally {
    loading.value = false
  }
}

/* ---------- Step 2: the 6-digit code ---------- */

function resetDigits() {
  digits.value = Array(CODE_LENGTH).fill('')
}

function setCodeInput(el: Element | null, index: number) {
  if (el) codeInputs.value[index] = el as HTMLInputElement
}

function onDigitInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const typed = input.value.replace(/\D/g, '')
  error.value = ''

  if (!typed) {
    digits.value[index] = ''
    input.value = ''
    return
  }

  // Distributes the characters so a pasted or fast-typed code fills the rest.
  let cursor = index
  for (const char of typed) {
    if (cursor >= CODE_LENGTH) break
    digits.value[cursor] = char
    cursor++
  }

  input.value = digits.value[index]
  codeInputs.value[Math.min(cursor, CODE_LENGTH - 1)]?.focus()

  if (code.value.length === CODE_LENGTH && !loading.value) verifyCode()
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    event.preventDefault()
    digits.value[index - 1] = ''
    codeInputs.value[index - 1]?.focus()
    return
  }
  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    codeInputs.value[index - 1]?.focus()
  }
  if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
    event.preventDefault()
    codeInputs.value[index + 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? ''
  if (!pasted) return
  event.preventDefault()
  error.value = ''
  for (let i = 0; i < CODE_LENGTH; i++) digits.value[i] = pasted[i] ?? ''
  codeInputs.value[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  if (pasted.length >= CODE_LENGTH && !loading.value) verifyCode()
}

async function verifyCode() {
  if (loading.value) return
  error.value = ''

  if (code.value.length !== CODE_LENGTH) {
    error.value = `Ingresá los ${CODE_LENGTH} dígitos del código.`
    return
  }

  loading.value = true
  try {
    const { resetToken: token } = await authService.verifyResetCode(email.value, code.value)
    resetToken.value = token
    step.value = 'password'
  } catch (err: any) {
    error.value = err?.message || 'El código es inválido o expiró.'
    resetDigits()
    codeInputs.value[0]?.focus()
  } finally {
    loading.value = false
  }
}

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_SECONDS
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

function backToEmail() {
  step.value = 'email'
  error.value = ''
  resetDigits()
}

/* ---------- Step 3: the new password ---------- */

async function submitPassword() {
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
    await authService.resetPassword(resetToken.value, password.value)
    done.value = true
    toast.success('¡Contraseña actualizada!')
    setTimeout(() => router.push('/auth/login'), 2500)
  } catch (err: any) {
    error.value = err?.message || 'No pudimos actualizar tu contraseña. Intentá de nuevo.'
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

        <!-- Stepper -->
        <ol v-if="!done" class="mb-8 flex items-center">
          <li v-for="(item, index) in steps" :key="item.number" class="flex items-center">
            <div class="flex items-center gap-2">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                :class="
                  currentStep > item.number
                    ? 'bg-green-100 text-green-600'
                    : currentStep === item.number
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                "
              >
                <Check v-if="currentStep > item.number" class="h-4 w-4" />
                <component :is="item.icon" v-else class="h-4 w-4" />
              </span>
              <span
                class="hidden text-sm font-medium sm:block"
                :class="currentStep >= item.number ? 'text-slate-700' : 'text-slate-400'"
              >
                {{ item.label }}
              </span>
            </div>
            <span
              v-if="index < steps.length - 1"
              class="mx-2 h-px w-6 shrink-0 sm:w-10"
              :class="currentStep > item.number ? 'bg-green-200' : 'bg-slate-200'"
            />
          </li>
        </ol>

        <!-- Success -->
        <div
          v-if="done"
          class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm font-medium text-green-700"
        >
          <div class="mb-1 flex items-center gap-2 text-base font-semibold">
            <CheckCircle2 class="h-5 w-5" />
            ¡Contraseña actualizada!
          </div>
          <p class="font-normal">Te estamos redirigiendo al inicio de sesión...</p>
        </div>

        <template v-else>
          <!-- Heading -->
          <h1 class="text-3xl font-bold text-slate-900">
            <template v-if="step === 'email'">Recuperá tu contraseña</template>
            <template v-else-if="step === 'code'">Ingresá el código</template>
            <template v-else>Nueva contraseña</template>
          </h1>
          <p class="mt-2 text-slate-500">
            <template v-if="step === 'email'">
              Ingresá tu email y te enviaremos un código de 6 dígitos.
            </template>
            <template v-else-if="step === 'code'">
              Enviamos un código a <span class="font-medium text-slate-700">{{ maskedEmail }}</span>
            </template>
            <template v-else>Elegí una nueva contraseña para tu cuenta</template>
          </p>

          <!-- Error -->
          <p
            v-if="error"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {{ error }}
          </p>

          <!-- ── Step 1: email ── -->
          <form v-if="step === 'email'" class="mt-8 space-y-5" @submit.prevent="sendCode(false)">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700" for="email">Email</label>
              <div class="relative">
                <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  class="input-base !py-3 !pl-11"
                  placeholder="tu@email.com"
                  autocomplete="email"
                />
              </div>
            </div>

            <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              Enviar código
            </button>
          </form>

          <!-- ── Step 2: code ── -->
          <form v-else-if="step === 'code'" class="mt-8 space-y-5" @submit.prevent="verifyCode">
            <div class="flex justify-between gap-2" @paste="onPaste">
              <input
                v-for="index in CODE_LENGTH"
                :key="index"
                :ref="(el) => setCodeInput(el as Element | null, index - 1)"
                :value="digits[index - 1]"
                :autocomplete="index === 1 ? 'one-time-code' : 'off'"
                type="text"
                inputmode="numeric"
                :maxlength="CODE_LENGTH"
                class="h-14 w-full rounded-xl border border-slate-200 bg-white text-center text-2xl font-bold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                @input="onDigitInput(index - 1, $event)"
                @keydown="onDigitKeydown(index - 1, $event)"
                @focus="($event.target as HTMLInputElement).select()"
              />
            </div>

            <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              Verificar código
            </button>

            <div class="flex items-center justify-between text-sm">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 font-medium transition-colors"
                :class="cooldown > 0 || loading ? 'cursor-not-allowed text-slate-400' : 'text-brand-600 hover:text-brand-700'"
                :disabled="cooldown > 0 || loading"
                @click="sendCode(true)"
              >
                <RefreshCw class="h-4 w-4" />
                <template v-if="cooldown > 0">Reenviar en {{ cooldown }}s</template>
                <template v-else>Reenviar código</template>
              </button>

              <button
                type="button"
                class="font-medium text-slate-500 hover:text-slate-700"
                @click="backToEmail"
              >
                Cambiar email
              </button>
            </div>
          </form>

          <!-- ── Step 3: new password ── -->
          <form v-else class="mt-8 space-y-4" @submit.prevent="submitPassword">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700" for="password">
                Nueva contraseña
              </label>
              <div class="relative">
                <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  class="input-base !py-3 !pl-11"
                  placeholder="Mínimo 8 caracteres"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700" for="confirmPassword">
                Confirmar contraseña
              </label>
              <div class="relative">
                <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirmPassword"
                  v-model="confirmPassword"
                  type="password"
                  class="input-base !py-3 !pl-11"
                  placeholder="Repetí la contraseña"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <button class="btn-primary w-full !py-3.5 !text-base" :disabled="loading">
              <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
              Actualizar contraseña
            </button>
          </form>
        </template>

        <!-- Back -->
        <div class="mt-8 text-center">
          <NuxtLink
            to="/auth/login"
            class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
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
