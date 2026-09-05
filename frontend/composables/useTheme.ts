const STORAGE_KEY = 'torox_theme'

/**
 * Light/dark theme for the storefront.
 * - Defaults to DARK (as requested).
 * - Persisted in localStorage so the user's choice survives reloads.
 * - The `dark` class is applied to <html> only outside the admin panel,
 *   which keeps /admin in its original light theme.
 */
export function useTheme() {
  const isDark = useState<boolean>('torox-theme', () => true)

  function init() {
    if (!import.meta.client) return
    const stored = localStorage.getItem(STORAGE_KEY)
    isDark.value = stored === 'light' ? false : true
    syncClass()
  }

  function toggle() {
    isDark.value = !isDark.value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    }
    syncClass()
  }

  function setDark(value: boolean) {
    isDark.value = value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
    }
    syncClass()
  }

  /** Toggle the .dark class on <html> based on the theme (no-op on admin). */
  function syncClass() {
    if (!import.meta.client) return
    const isAdmin = window.location.pathname.startsWith('/admin')
    document.documentElement.classList.toggle('dark', isDark.value && !isAdmin)
  }

  return { isDark, init, toggle, setDark, syncClass }
}
