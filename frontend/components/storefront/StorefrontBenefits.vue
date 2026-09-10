<script setup lang="ts">
import Truck from '~/assets/icon-truck.png'
import CreditCard from '~/assets/icon-pay.svg'
import ShieldCheck from '~/assets/icon-security.svg'

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
  <div class="grid grid-cols-1 gap-6 rounded-2xl bg-dark-900 px-6 py-6 shadow-lg sm:px-10 md:grid-cols-3 md:gap-8">
    <div
      v-for="benefit in benefits"
      :key="benefit.title"
      class="flex items-center gap-4"
    >
      <div class="flex h-12 w-12 shrink-0 items-center justify-center">
        <img :src="benefit.icon" :alt="benefit.title" class="h-12 w-12 object-contain" />
      </div>
      <div class="min-w-0">
        <p class="font-bold text-white">{{ benefit.title }}</p>
        <p class="text-sm text-slate-400">{{ benefit.subtitle }}</p>
      </div>
    </div>
  </div>
</template>
