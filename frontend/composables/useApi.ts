import { useRuntimeConfig } from '#imports'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown> | any[]
  query?: Record<string, unknown>
  headers?: Record<string, string>
}

/**
 * Thin wrapper around $fetch that:
 *  - prefixes the API base URL
 *  - injects the JWT when logged in
 *  - unwraps the { success, data, meta } envelope
 *  - throws Error with a human message on failure
 */
export function useApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  const api = async <T = any>(path: string, options: ApiOptions = {}): Promise<T> => {
    const headers: Record<string, string> = { ...(options.headers || {}) }
    if (import.meta.client) {
      const token = localStorage.getItem('torox_token')
      if (token) headers.Authorization = `Bearer ${token}`
    }

    try {
      const raw: any = await $fetch(`${base}${path}`, {
        method: options.method || 'GET',
        body: options.body as any,
        query: options.query,
        headers,
      })

      if (raw && typeof raw === 'object' && 'success' in raw) {
        if (raw.success === false) {
          const message = Array.isArray(raw.message)
            ? raw.message.join(', ')
            : raw.message || 'Error del servidor'
          throw new Error(message)
        }
        return raw.data
      }
      return raw as T
    } catch (error: any) {
      if (error instanceof Error && error.message && !('data' in error)) {
        throw error
      }
      const message =
        error?.data?.message || error?.message || 'Error de conexión con el servidor'
      throw new Error(Array.isArray(message) ? message.join(', ') : message)
    }
  }

  const list = async <T = any>(path: string, options: ApiOptions = {}) => {
    const raw: any = await $fetch(`${base}${path}`, {
      method: options.method || 'GET',
      body: options.body as any,
      query: options.query,
      headers: await headers(),
    })
    if (raw && typeof raw === 'object' && 'success' in raw) {
      if (raw.success === false) {
        throw new Error(
          Array.isArray(raw.message) ? raw.message.join(', ') : raw.message || 'Error',
        )
      }
      if ('meta' in raw) return { items: raw.data as T[], meta: raw.meta }
      return { items: raw.data as T[], meta: undefined }
    }
    return { items: raw as T[], meta: undefined }
  }

  async function headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = {}
    if (import.meta.client) {
      const token = localStorage.getItem('torox_token')
      if (token) h.Authorization = `Bearer ${token}`
    }
    return h
  }

  return { api, list }
}

export type ApiClient = ReturnType<typeof useApi>