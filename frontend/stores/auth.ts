import { defineStore } from 'pinia'
import type { User } from '~/types'
import { authService } from '~/services'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: '' as string,
    loaded: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },
  actions: {
    init() {
      if (import.meta.client && !this.loaded) {
        const token = localStorage.getItem('torox_token')
        const user = localStorage.getItem('torox_user')
        if (token) this.token = token
        if (user) {
          try {
            this.user = JSON.parse(user)
          } catch {
            this.user = null
          }
        }
        this.loaded = true
      }
    },
    setSession(token: string, user: User) {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('torox_token', token)
        localStorage.setItem('torox_user', JSON.stringify(user))
      }
    },
    async login(email: string, password: string) {
      const result = await authService.login(email, password)
      this.setSession(result.access_token, result.user)
      return result.user
    },
    async register(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) {
      const result = await authService.register(data)
      this.setSession(result.access_token, result.user)
      return result.user
    },
    async refreshProfile() {
      if (!this.token) return
      try {
        const user = await authService.me()
        this.user = user
        if (import.meta.client) localStorage.setItem('torox_user', JSON.stringify(user))
      } catch {
        // token invalid
        this.logout()
      }
    },
    logout() {
      this.token = ''
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('torox_token')
        localStorage.removeItem('torox_user')
      }
    },
  },
})