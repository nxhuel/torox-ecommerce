import { reactive } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const state = reactive<{ toasts: Toast[] }>({ toasts: [] })
let counter = 0

export function useToast() {
  const show = (message: string, type: Toast['type'] = 'info', duration = 3500) => {
    const id = ++counter
    state.toasts.push({ id, message, type })
    setTimeout(() => {
      const index = state.toasts.findIndex((t) => t.id === id)
      if (index !== -1) state.toasts.splice(index, 1)
    }, duration)
  }

  const success = (message: string) => show(message, 'success')
  const error = (message: string) => show(message, 'error')
  const info = (message: string) => show(message, 'info')

  const remove = (id: number) => {
    const index = state.toasts.findIndex((t) => t.id === id)
    if (index !== -1) state.toasts.splice(index, 1)
  }

  return { toasts: state.toasts, show, success, error, info, remove }
}

export function useToastWidget() {
  return { toasts: state.toasts }
}