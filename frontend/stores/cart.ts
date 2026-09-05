import { defineStore } from 'pinia'
import type { Cart } from '~/types'
import { cartService } from '~/services'
import { useAuthStore } from './auth'

function makeSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getSessionId(): string {
  if (!import.meta.client) return ''
  let id = localStorage.getItem('torox_session')
  if (!id) {
    id = makeSessionId()
    localStorage.setItem('torox_session', id)
  }
  return id
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    cart: null as Cart | null,
    loading: false,
    sessionId: '' as string,
  }),
  getters: {
    count: (state) =>
      state.cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0,
    subtotal: (state) => state.cart?.subtotal || 0,
    total: (state) => state.cart?.total || 0,
  },
  actions: {
    session() {
      if (!this.sessionId) this.sessionId = getSessionId()
      return this.sessionId
    },
    async init() {
      const auth = useAuthStore()
      auth.init()
      this.loading = true
      try {
        this.cart = await cartService.get(auth.isAuthenticated ? undefined : this.session())
      } finally {
        this.loading = false
      }
    },
    async refresh() {
      const auth = useAuthStore()
      this.cart = await cartService.get(auth.isAuthenticated ? undefined : this.session())
    },
    async add(productId: string, quantity = 1) {
      const auth = useAuthStore()
      if (!this.cart) await this.init()
      await cartService.addItem(this.cart!.id, productId, quantity)
      await this.refresh()
    },
    async update(itemId: string, quantity: number) {
      if (!this.cart) return
      await cartService.updateItem(itemId, this.cart.id, quantity)
      await this.refresh()
    },
    async remove(itemId: string) {
      if (!this.cart) return
      await cartService.removeItem(itemId, this.cart.id)
      await this.refresh()
    },
    async clear() {
      if (!this.cart) return
      await cartService.clear(this.cart.id)
      await this.refresh()
    },
  },
})