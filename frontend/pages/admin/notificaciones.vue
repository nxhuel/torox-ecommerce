<script setup lang="ts">
import { Send, Loader2, Bell, Gift, Tag, Package, Truck, Info } from 'lucide-vue-next'
import type { Notification } from '~/types'
import { notificationsService } from '~/services'
import { NOTIFICATION_TYPE_LABELS, useFormat } from '~/composables/useFormat'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { dateTime } = useFormat()
const toast = useToast()
const notifications = ref<Notification[]>([])
const loading = ref(true)
const sending = ref(false)
const testingMail = ref(false)
const mailResult = ref<{ ok: boolean; from: string; error?: string } | null>(null)
const { api } = useApi()

/** Manda un mail de prueba al admin y muestra lo que respondió Resend. */
async function testMail() {
  testingMail.value = true
  mailResult.value = null
  try {
    mailResult.value = await api('/mail/test', { method: 'POST' })
  } catch (e: any) {
    mailResult.value = { ok: false, from: '', error: e?.message }
  } finally {
    testingMail.value = false
  }
}

const form = reactive({
  type: 'PROMOTION',
  title: '',
  message: '',
  link: '',
})

const typeIcons: Record<string, Component> = {
  PROMOTION: Gift,
  OFFER: Tag,
  ORDER_STATUS: Package,
  SHIPMENT_STATUS: Truck,
  SYSTEM: Info,
}

onMounted(async () => {
  try {
    notifications.value = await notificationsService.all()
  } finally {
    loading.value = false
  }
})

async function send() {
  if (!form.title || !form.message) {
    toast.error('Completá título y mensaje')
    return
  }
  sending.value = true
  try {
    await notificationsService.broadcast({
      type: form.type,
      title: form.title,
      message: form.message,
      link: form.link || undefined,
    })
    toast.success('Notificación enviada a todos los clientes')
    form.title = ''
    form.message = ''
    form.link = ''
    notifications.value = await notificationsService.all()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    sending.value = false
  }
}

const typeStyles: Record<string, string> = {
  PROMOTION: 'bg-pink-50 text-pink-600',
  OFFER: 'bg-amber-50 text-amber-600',
  ORDER_STATUS: 'bg-brand-50 text-brand-600',
  SHIPMENT_STATUS: 'bg-indigo-50 text-indigo-600',
  SYSTEM: 'bg-slate-100 text-slate-500',
}
</script>

<template>
 <div>
  <div class="mb-6 card p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-bold text-slate-900">Mails (Resend)</h2>
        <p class="text-sm text-slate-500">Manda un mail de prueba a tu casilla de admin para ver si los envíos funcionan.</p>
      </div>
      <button class="btn-secondary" :disabled="testingMail" @click="testMail">
        <Loader2 v-if="testingMail" class="h-4 w-4 animate-spin" />
        Probar envío de mails
      </button>
    </div>
    <p v-if="mailResult?.ok" class="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
      Resend aceptó el mail (remitente {{ mailResult.from }}). Revisá tu bandeja y la carpeta de spam.
    </p>
    <p v-else-if="mailResult" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      No se pudo enviar: {{ mailResult.error }}<template v-if="mailResult.from"> (remitente {{ mailResult.from }})</template>
    </p>
  </div>
  <div class="grid gap-6 lg:grid-cols-2">
    <!-- Broadcast form -->
    <div class="card h-fit p-6">
      <h2 class="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Send class="h-5 w-5 text-brand-600" /> Enviar notificación
      </h2>
      <p class="mb-5 text-sm text-slate-500">Se envía a todos los clientes registrados</p>

      <div class="space-y-4">
        <div>
          <label class="label-base">Tipo</label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              v-for="(label, key) in NOTIFICATION_TYPE_LABELS"
              :key="key"
              class="rounded-lg border px-3 py-2 text-xs font-semibold transition"
              :class="form.type === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
              @click="form.type = key"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div>
          <label class="label-base">Título *</label>
          <input v-model="form.title" class="input-base" placeholder="¡Nueva oferta disponible!" />
        </div>
        <div>
          <label class="label-base">Mensaje *</label>
          <textarea v-model="form.message" rows="3" class="input-base" placeholder="Descripción de la notificación" />
        </div>
        <div>
          <label class="label-base">Link (opcional)</label>
          <input v-model="form.link" class="input-base" placeholder="/productos" />
        </div>
        <button class="btn-primary w-full" :disabled="sending" @click="send">
          <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          Enviar a todos los clientes
        </button>
      </div>
    </div>

    <!-- Recent notifications -->
    <div>
      <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Bell class="h-5 w-5 text-brand-600" /> Notificaciones recientes
      </h2>
      <div v-if="loading" class="space-y-3">
        <BaseSkeleton v-for="i in 4" :key="i" class="h-20 !rounded-xl" />
      </div>
      <div v-else-if="notifications.length" class="space-y-3">
        <div v-for="notification in notifications.slice(0, 10)" :key="notification.id" class="card p-4">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" :class="typeStyles[notification.type]">
              <component :is="typeIcons[notification.type] || Bell" class="h-4.5 w-4.5" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold text-slate-900">{{ notification.title }}</p>
                <span class="text-xs text-slate-400">{{ dateTime(notification.createdAt) }}</span>
              </div>
              <p class="mt-0.5 line-clamp-2 text-sm text-slate-600">{{ notification.message }}</p>
              <p class="mt-1 text-xs text-slate-400">
                {{ NOTIFICATION_TYPE_LABELS[notification.type] }} • {{ notification.isRead ? 'Leída' : 'No leída' }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else icon="bell" title="Sin notificaciones" description="Las notificaciones enviadas aparecerán acá." />
    </div>
  </div>
 </div>
</template>