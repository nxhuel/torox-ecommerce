<script setup lang="ts">
import { STORE, whatsappLink } from '~/utils/store'
import instagramIcon from '~/assets/social/instagram.webp'
import facebookIcon from '~/assets/social/facebook.webp'
import tiktokIcon from '~/assets/social/tiktok.webp'
import MercadoPago from '~/assets/payments/mercadopago.svg'
import Visa from '~/assets/payments/visa.svg'
import Mastercard from '~/assets/payments/mastercard.svg'
import NaranjaX from '~/assets/payments/naranjax.svg'
import logo from '~/assets/logo.png'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()

onMounted(() => auth.init())

const supportUrl = whatsappLink('Hola! Necesito ayuda con mi compra en TOROX.')

const accountLink = computed(() => (auth.isAuthenticated ? '/cuenta/perfil' : '/auth/login'))
const ordersLink = computed(() => (auth.isAuthenticated ? '/cuenta/compras' : '/auth/login'))
</script>

<template>
  <footer class="bg-dark-950 text-slate-300" :class="route.path === '/' ? '' : 'mt-16'">
    <div class="container-torox grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div class="max-w-sm">
        <div class="flex items-center gap-3">
          <img :src="logo" alt="" class="h-11 w-auto object-contain" />
          <span class="font-display text-3xl text-white">TOROX</span>
        </div>
        <p class="mt-5 leading-relaxed text-slate-400">
          Cámaras, cerraduras inteligentes y accesorios de seguridad. Desde {{ STORE.area }} a todo el país.
        </p>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-white">Tienda</h2>
        <ul class="mt-4 space-y-3 text-sm">
          <li><NuxtLink to="/productos" class="hover:text-white">Todos los productos</NuxtLink></li>
          <li><NuxtLink to="/productos?isFeatured=true" class="hover:text-white">Destacados</NuxtLink></li>
          <li><NuxtLink to="/faq" class="hover:text-white">Preguntas frecuentes</NuxtLink></li>
        </ul>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-white">Tu compra</h2>
        <ul class="mt-4 space-y-3 text-sm">
          <li><NuxtLink :to="accountLink" class="hover:text-white">Mi cuenta</NuxtLink></li>
          <li><NuxtLink :to="ordersLink" class="hover:text-white">Mis compras y seguimiento</NuxtLink></li>
          <li><a :href="supportUrl" target="_blank" rel="noopener noreferrer" class="hover:text-white">Ayuda con un pedido</a></li>
        </ul>
      </div>

      <div>
        <h2 class="text-sm font-semibold text-white">Contacto</h2>
        <ul class="mt-4 space-y-3 text-sm">
          <li><a :href="whatsappLink()" target="_blank" rel="noopener noreferrer" class="hover:text-white">WhatsApp {{ STORE.whatsappDisplay }}</a></li>
          <li><a :href="`mailto:${STORE.email}`" class="break-all hover:text-white">{{ STORE.email }}</a></li>
          <li class="flex gap-3 pt-2">
            <a :href="STORE.social.instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram de TOROX" class="transition hover:-translate-y-0.5">
              <img :src="instagramIcon" alt="Instagram" width="40" height="40" class="h-10 w-10" />
            </a>
            <a :href="STORE.social.facebook" target="_blank" rel="noopener noreferrer" aria-label="Facebook de TOROX" class="transition hover:-translate-y-0.5">
              <img :src="facebookIcon" alt="Facebook" width="40" height="40" class="h-10 w-10" />
            </a>
            <a :href="STORE.social.tiktok" target="_blank" rel="noopener noreferrer" aria-label="TikTok de TOROX" class="transition hover:-translate-y-0.5">
              <img :src="tiktokIcon" alt="TikTok" width="40" height="40" class="h-10 w-10" />
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="container-torox flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-slate-400">Pagás con Mercado Pago: tarjetas de crédito, débito y dinero en cuenta.</p>
        <div class="flex items-center gap-3">
          <img :src="MercadoPago" alt="Mercado Pago" class="h-7 w-auto" />
          <img :src="Visa" alt="Visa" class="h-7 w-auto rounded-[5px]" />
          <img :src="Mastercard" alt="Mastercard" class="h-7 w-auto rounded-[5px]" />
          <img :src="NaranjaX" alt="Naranja X" class="h-7 w-auto" />
        </div>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="container-torox flex flex-col justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
        <p>© {{ new Date().getFullYear() }} TOROX Seguridad</p>
        <p>Desarrollado por Clik</p>
      </div>
    </div>
  </footer>
</template>
