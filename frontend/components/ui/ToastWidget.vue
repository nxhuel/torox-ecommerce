<script setup lang="ts">
import { AlertCircle, Check, Info } from 'lucide-vue-next'
import { useToastWidget } from '~/composables/useToast'

const { toasts } = useToastWidget()
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg animate-fade-in-up"
          :class="{
            'border-red-200': toast.type === 'error',
            'border-emerald-200': toast.type === 'success',
            'border-slate-200': toast.type === 'info',
          }"
        >
          <span
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
            :class="{
              'bg-red-500': toast.type === 'error',
              'bg-emerald-500': toast.type === 'success',
              'bg-brand-500': toast.type === 'info',
            }"
          >
            <AlertCircle v-if="toast.type === 'error'" class="h-4 w-4" />
            <Check v-else-if="toast.type === 'success'" class="h-4 w-4" />
            <Info v-else class="h-4 w-4" />
          </span>
          <p class="flex-1 text-sm font-medium text-slate-800">{{ toast.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>