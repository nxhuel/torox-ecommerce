import { defineStore } from 'pinia'
import type { Notification } from '~/types'
import { notificationsService } from '~/services'
import { useAuthStore } from './auth'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as Notification[],
    unread: 0,
    loaded: false,
  }),
  actions: {
    async load() {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        this.items = []
        this.unread = 0
        this.loaded = true
        return
      }
      try {
        const [items, unread] = await Promise.all([
          notificationsService.all(),
          notificationsService.unreadCount(),
        ])
        this.items = items
        this.unread = unread
      } catch {
        // ignore
      }
      this.loaded = true
    },
    async markRead(id: string) {
      await notificationsService.markRead(id)
      const item = this.items.find((n) => n.id === id)
      if (item) item.isRead = true
      this.unread = Math.max(0, this.unread - 1)
    },
    async markAllRead() {
      await notificationsService.markAllRead()
      this.items.forEach((n) => (n.isRead = true))
      this.unread = 0
    },
  },
})