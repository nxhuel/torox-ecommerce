<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{ close: [] }>()

const sizeClass = computed(() => {
  switch (props.size || 'md') {
    case 'sm':
      return 'max-w-md'
    case 'lg':
      return 'max-w-3xl'
    default:
      return 'max-w-xl'
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" @click="emit('close')" />
        <div
          class="relative w-full animate-fade-in-up rounded-2xl bg-white shadow-2xl"
          :class="sizeClass"
        >
          <div v-if="title || $slots.header" class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 class="text-lg font-bold text-slate-900">
              <slot name="header">{{ title }}</slot>
            </h3>
            <button
              class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="max-h-[75vh] overflow-y-auto px-6 py-5">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>