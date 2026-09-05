<script setup lang="ts">
import { Bell, CheckCheck, Gift, Tag, Package, Truck, Info } from 'lucide-vue-next'
import { useNotificationsStore } from '~/stores/notifications'
import { NOTIFICATION_TYPE_LABELS, useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'account', middleware: 'auth' })

const notifications = useNotificationsStore()
const { dateTime } = useFormat()

onMounted(() => notifications.load())

const typeIcons = {
  PROMOTION: Gift,
  OFFER: Tag,
  ORDER_STATUS: Package,
  SHIPMENT_STATUS: Truck,
  SYSTEM: Info,
}

async function markRead(id: string) {
  await notifications.markRead(id)
}

async function markAll() {
  await notifications.markAllRead()
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
    <div class="mb-6 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-bold text-slate-900">Notificaciones</h1>
      <button
        v-if="notifications.unread > 0"
        class="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        @click="markAll"
      >
        <CheckCheck class="h-4 w-4" /> Marcar todas como leídas
      </button>
    </div>

    <div v-if="!notifications.loaded" class="space-y-3">
      <BaseSkeleton v-for="i in 4" :key="i" class="h-20 !rounded-xl" />
    </div>

    <div v-else-if="notifications.items.length" class="space-y-3">
      <div
        v-for="notification in notifications.items"
        :key="notification.id"
        class="flex gap-3 rounded-xl border p-4 transition sm:gap-4"
        :class="notification.isRead ? 'border-slate-200 bg-white' : 'border-brand-200 bg-brand-50/40'"
        :style="{ cursor: notification.link ? 'pointer' : 'default' }"
        @click="notification.link && markRead(notification.id)"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          :class="typeStyles[notification.type] || 'bg-slate-100 text-slate-500'"
        >
          <component :is="typeIcons[notification.type] || Bell" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p class="min-w-0 font-semibold text-slate-900">
              {{ notification.title }}
              <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {{ NOTIFICATION_TYPE_LABELS[notification.type] || notification.type }}
              </span>
            </p>
            <span v-if="!notification.isRead" class="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
          </div>
          <p class="mt-0.5 text-sm text-slate-600">{{ notification.message }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ dateTime(notification.createdAt) }}</p>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="bell"
      title="No tenés notificaciones"
      description="Te avisaremos sobre tus pedidos, envíos y las mejores ofertas."
    />
  </div>
</template>