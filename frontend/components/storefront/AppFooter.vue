<script setup lang="ts">
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from 'lucide-vue-next'
import logo from '~/assets/logo.png'
</script>

<template>
  <footer class="mt-16 bg-dark-800 text-slate-300">
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
          <li><NuxtLink to="/productos?isOnSale=true" class="transition hover:text-white">Ofertas</NuxtLink></li>
          <li><NuxtLink to="/productos?isFeatured=true" class="transition hover:text-white">Destacados</NuxtLink></li>
          <li><NuxtLink to="/carrito" class="transition hover:text-white">Mi carrito</NuxtLink></li>
        </ul>
      </div>

      <div>
        <h4 class="text-sm font-bold uppercase tracking-wider text-white">Atención al cliente</h4>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li><NuxtLink to="/auth/login" class="transition hover:text-white">Mi cuenta</NuxtLink></li>
          <li><NuxtLink to="/auth/login" class="transition hover:text-white">Mis compras</NuxtLink></li>
          <li><NuxtLink to="/auth/login" class="transition hover:text-white">Estado de pedidos</NuxtLink></li>
          <li><NuxtLink to="/auth/login" class="transition hover:text-white">Ayuda y soporte</NuxtLink></li>
        </ul>
      </div>

      <div>
        <h4 class="text-sm font-bold uppercase tracking-wider text-white">Contacto</h4>
        <ul class="mt-4 space-y-2.5 text-sm">
          <li class="flex items-center gap-2.5"><Phone class="h-4 w-4 text-brand-400" /> 0800-555-TOROX</li>
          <li class="flex items-center gap-2.5"><Mail class="h-4 w-4 text-brand-400" /> hola@torox.com.ar</li>
          <li class="flex items-center gap-2.5"><MapPin class="h-4 w-4 text-brand-400" /> Buenos Aires, Argentina</li>
        </ul>
        <div class="mt-4 flex gap-3">
          <a href="#" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Instagram">
            <Instagram class="h-4 w-4" />
          </a>
          <a href="#" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="Facebook">
            <Facebook class="h-4 w-4" />
          </a>
          <a href="#" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" aria-label="LinkedIn">
            <Linkedin class="h-4 w-4" />
          </a>
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