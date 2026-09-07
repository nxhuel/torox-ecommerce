<script setup lang="ts">
import { Truck, CreditCard, ShieldCheck } from 'lucide-vue-next'

const benefits = [
  {
    icon: Truck,
    title: 'Enviamos tu compra',
    subtitle: 'Entregas a todo el país',
  },
  {
    icon: CreditCard,
    title: 'Pagá como quieras',
    subtitle: 'Tarjetas de crédito o Transferencia',
  },
  {
    icon: ShieldCheck,
    title: 'Comprá con seguridad',
    subtitle: 'Tus datos siempre protegidos',
  },
]
</script>

<template>
  <div class="grid grid-cols-1 gap-6 rounded-2xl bg-white px-6 py-6 shadow-card sm:px-10 md:grid-cols-3 md:gap-8">
    <div
      v-for="benefit in benefits"
      :key="benefit.title"
      class="flex items-center gap-4"
    >
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50">
        <component :is="benefit.icon" class="h-6 w-6 text-brand-600" />
      </div>
      <div class="min-w-0">
        <p class="font-bold text-slate-900">{{ benefit.title }}</p>
        <p class="text-sm text-slate-500">{{ benefit.subtitle }}</p>
      </div>
    </div>
  </div>
</template>
