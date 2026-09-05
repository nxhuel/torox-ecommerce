export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) {
    const token = localStorage.getItem('torox_token')
    if (!token) {
      return navigateTo('/auth/login?redirect=' + encodeURIComponent(to.fullPath))
    }
    try {
      const user = JSON.parse(localStorage.getItem('torox_user') || '{}')
      if (user.role !== 'ADMIN') {
        return navigateTo('/')
      }
    } catch {
      return navigateTo('/auth/login')
    }
  }
})