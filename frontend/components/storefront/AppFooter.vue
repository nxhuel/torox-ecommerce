<script setup lang="ts">
import { Phone, Mail, MapPin } from 'lucide-vue-next'
import Instagram from '~/assets/icon-instagram.png'
import Facebook from '~/assets/icon-facebook.png'
import TikTok from '~/assets/icon-tiktok.png'
import WhatsApp from '~/assets/icon-wspp.png'
import MercadoPago from '~/assets/payments/mercadopago.svg'
import Visa from '~/assets/payments/visa.svg'
import Mastercard from '~/assets/payments/mastercard.svg'
import NaranjaX from '~/assets/payments/naranjax.svg'
import logo from '~/assets/logo.png'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

onMounted(() => auth.init())

const SUPPORT_WHATSAPP = '5491171383512'
const supportMessage = 'Hola! Necesito ayuda y soporte con mi compra en TOROX.'
const supportUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(supportMessage)}`

const accountLink = computed(() => (auth.isAuthenticated ? '/cuenta/perfil' : '/auth/login'))
const ordersLink = computed(() => (auth.isAuthenticated ? '/cuenta/compras' : '/auth/login'))
</script>

<template>
  <footer class="mt-16 bg-dark-950 text-slate-300">
    <div class="container-torox grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div class="flex items-center gap-3">
          <img :src="logo" alt="TOROX" class="h-12 w-auto object-contain drop-shadow-[0_0_14px_rgba(125,211,252,0.35)]" />
          <span class="text-2xl font-black tracking-tight text-white">TOROX<span class="text-brand-400">.</span></span>
        </div>
        <p class="mt-4 text-sm leading-relaxed text-slate-400">
          Soluciones avanzadas de seguridad para hogares y empresas. Tecnología diseñada para proteger tus espacios las 24 horas.
        </p>
      </div>

      <div>
        <h4 class="text-sm font-bold uppercase tracking-wider text-white">Tienda</h4>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li><NuxtLink to="/productos" class="transition hover:text-white">Productos</NuxtLink></li>
          <li><NuxtLink to="/productos?isFeatured=true" class="transition hover:text-white">Destacados</NuxtLink></li>
        </ul>
      </div>

      <div>
        <h4 class="text-sm font-bold uppercase tracking-wider text-white">Atención al cliente</h4>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li><NuxtLink :to="accountLink" class="transition hover:text-white">Mi cuenta</NuxtLink></li>
          <li><NuxtLink :to="ordersLink" class="transition hover:text-white">Mis compras</NuxtLink></li>
          <li>
            <a
              href="https://envia.com/rastreo"
              target="_blank"
              rel="noopener noreferrer"
              class="transition hover:text-white"
            >
              Estado de pedidos
            </a>
          </li>
          <li>
            <a
              :href="supportUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="transition hover:text-white"
            >
              Ayuda y soporte
            </a>
          </li>
        </ul>
      </div>

      <div>
        <h4 class="text-sm font-bold uppercase tracking-wider text-white">Contacto</h4>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li class="flex items-center gap-2.5"><Phone class="h-4 w-4 text-brand-400" />+54 9 11 7138-3512</li>
          <li class="flex items-center gap-2.5"><Mail class="h-4 w-4 text-brand-400" /> toroxseguridad@gmail.com</li>
          <li class="flex items-center gap-2.5"><MapPin class="h-4 w-4 text-brand-400" /> Buenos Aires, Argentina</li>
        </ul>
        <div class="mt-8">
          <p class="text-[11px] font-semibold text-slate-300">Seguinos!</p>
          <div class="mt-3 flex items-center gap-3">
            <a
              href="https://www.instagram.com/torox.arg/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"
              aria-label="Instagram"
            >
              <img :src="Instagram" alt="Instagram" class="h-8 w-8 object-contain" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61593927764597"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"
              aria-label="Facebook"
            >
              <img :src="Facebook" alt="Facebook" class="h-8 w-8 object-contain" />
            </a>
            <a
              href="https://www.tiktok.com/@torox.arg"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"
              aria-label="TikTok"
            >
              <img :src="TikTok" alt="TikTok" class="h-8 w-8 object-contain" />
            </a>
            <a
              href="https://wa.me/5491171383512?text=Hola!%20Quisiera%20saber%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20productos."
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 hover:scale-110"
              aria-label="WhatsApp"
            >
              <img :src="WhatsApp" alt="WhatsApp" class="h-8 w-8 object-contain" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="container-torox flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
        <p class="text-[11px] leading-relaxed text-slate-400">
          Pagá con Mercado Pago, Tarjetas de crédito y débito de todos los bancos.
        </p>
        <div class="flex flex-nowrap items-center gap-3">
          <img
            :src="MercadoPago"
            alt="Mercado Pago"
            class="h-6 w-auto min-w-0 shrink object-contain sm:h-8"
          />
          <img
            :src="Visa"
            alt="Visa"
            class="h-6 w-auto min-w-0 shrink rounded-[5px] object-contain shadow-sm ring-1 ring-white/15 sm:h-8"
          />
          <img
            :src="Mastercard"
            alt="Mastercard"
            class="h-6 w-auto min-w-0 shrink rounded-[5px] object-contain shadow-sm ring-1 ring-white/15 sm:h-8"
          />
          <img
            :src="NaranjaX"
            alt="Naranja X"
            class="h-6 w-auto min-w-0 shrink object-contain sm:h-8"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-white/10">
      <div class="container-torox flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
        <p>© {{ new Date().getFullYear() }} TOROX Seguridad. Todos los derechos reservados.</p>
        <p>Desarrollado por Clik — Torox</p>
      </div>
    </div>
  </footer>
</template>