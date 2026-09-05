<script setup lang="ts">
import {
  Search,
  ShoppingCart,
  Heart,
  Bell,
  MapPin,
  Menu,
  X,
  Shield,
  ChevronDown,
  User,
  LogOut,
  Package,
  UserCircle,
  Sun,
  Moon,
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useNotificationsStore } from '~/stores/notifications'
import logo from '~/assets/logo.png'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const notifications = useNotificationsStore()
const { isDark: isDarkTheme, toggle: toggleTheme } = useTheme()
const toast = useToast()

const searchQuery = ref('')
const mobileOpen = ref(false)
const accountOpen = ref(false)
const notifOpen = ref(false)
const notifMenuRef = ref<HTMLElement | null>(null)
const location = ref('Buenos Aires')

onMounted(() => {
  auth.init()
  cart.init()
  if (auth.isAuthenticated) notifications.load()
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

function onClickOutside(event: MouseEvent) {
  if (notifMenuRef.value && !notifMenuRef.value.contains(event.target as Node)) {
    notifOpen.value = false
  }
}

const recentNotifications = computed(() => notifications.items.slice(0, 3))

function toggleNotifications() {
  if (!notifications.loaded && auth.isAuthenticated) notifications.load()
  notifOpen.value = !notifOpen.value
}

async function openNotification(id: string) {
  const item = notifications.items.find((n) => n.id === id)
  if (item && !item.isRead) await notifications.markRead(id)
}

function submitSearch() {
  const q = searchQuery.value.trim()
  router.push(q ? { path: '/productos', query: { search: q } } : '/productos')
  mobileOpen.value = false
}

function goToCart() {
  router.push('/carrito')
}

function logout() {
  auth.logout()
  notifications.items = []
  notifications.unread = 0
  toast.success('Sesión cerrada')
  router.push('/')
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-white shadow-sm">
    <!-- First row -->
    <div class="border-b border-slate-100">
      <div class="container-torox flex h-16 items-center gap-4">
        <!-- Mobile hamburger -->
        <button
          class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-5 w-5" />
          <Menu v-else class="h-5 w-5" />
        </button>

        <!-- Logo -->
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2.5">
          <img :src="logo" alt="TOROX" class="h-12 w-auto object-contain drop-shadow-[0_2px_6px_rgba(2,116,197,0.35)]" />
          <span class="text-2xl font-black tracking-tight text-dark-800">
            TOROX<span class="text-brand-600">.</span>
          </span>
        </NuxtLink>

        <!-- Search -->
        <form class="hidden flex-1 items-center lg:flex" @submit.prevent="submitSearch">
          <div class="relative w-full max-w-2xl">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar productos, marcas y más..."
              class="input-base !rounded-full !py-2.5 !pl-4 !pr-12"
            />
            <button
              type="submit"
              class="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700"
              aria-label="Buscar"
            >
              <Search class="h-4 w-4" />
            </button>
          </div>
        </form>

        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <!-- Theme toggle -->
          <button
            class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            :aria-label="isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            @click="toggleTheme()"
          >
            <Sun v-if="isDarkTheme" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
          </button>

          <!-- Guest -->
          <template v-if="!auth.isAuthenticated">
            <NuxtLink
              to="/auth/registro"
              class="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:block"
            >
              Creá tu cuenta
            </NuxtLink>
            <NuxtLink
              to="/auth/login"
              class="hidden rounded-lg border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 md:block"
            >
              Ingresá
            </NuxtLink>
          </template>

          <!-- Authenticated -->
          <template v-else>
            <div class="relative hidden md:block">
              <button
                class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                @click="accountOpen = !accountOpen"
              >
                <UserCircle class="h-5 w-5 text-brand-600" />
                <span class="max-w-[120px] truncate">Hola, {{ auth.user?.firstName }}</span>
                <ChevronDown class="h-3.5 w-3.5 text-slate-400" />
              </button>
              <Transition name="dropdown">
                <div
                  v-if="accountOpen"
                  class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
                  @click="accountOpen = false"
                >
                  <NuxtLink to="/cuenta/perfil" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <User class="h-4 w-4 text-slate-400" /> Mi cuenta
                  </NuxtLink>
                  <NuxtLink to="/cuenta/compras" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Package class="h-4 w-4 text-slate-400" /> Mis compras
                  </NuxtLink>
                  <NuxtLink to="/cuenta/favoritos" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Heart class="h-4 w-4 text-slate-400" /> Mis favoritos
                  </NuxtLink>
                  <NuxtLink v-if="auth.isAdmin" to="/admin" class="flex items-center gap-2.5 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                    <Shield class="h-4 w-4" /> Panel admin
                  </NuxtLink>
                  <button
                    class="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    @click="logout"
                  >
                    <LogOut class="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              </Transition>
            </div>
          </template>

          <!-- Favorites (auth only) -->
          <NuxtLink
            v-if="auth.isAuthenticated"
            to="/cuenta/favoritos"
            class="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-red-500"
            aria-label="Favoritos"
          >
            <Heart class="h-5 w-5" />
          </NuxtLink>

          <!-- Notifications (auth only) -->
          <div
            v-if="auth.isAuthenticated"
            ref="notifMenuRef"
            class="relative"
          >
            <button
              class="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Notificaciones"
              @click="toggleNotifications"
            >
              <Bell class="h-5 w-5" />
              <span
                v-if="notifications.unread > 0"
                class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
              >
                {{ notifications.unread > 9 ? '9+' : notifications.unread }}
              </span>
            </button>

            <Transition name="dropdown">
              <div
                v-if="notifOpen"
                class="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg"
              >
                <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p class="text-sm font-bold text-slate-900">Notificaciones</p>
                  <button
                    v-if="notifications.unread > 0"
                    class="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    @click="notifications.markAllRead()"
                  >
                    Marcar todas
                  </button>
                </div>

                <div v-if="recentNotifications.length" class="max-h-72 overflow-y-auto">
                  <button
                    v-for="notification in recentNotifications"
                    :key="notification.id"
                    class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    @click="openNotification(notification.id)"
                  >
                    <span
                      class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      :class="notification.isRead ? 'bg-slate-200' : 'bg-brand-500'"
                    />
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-semibold text-slate-800">{{ notification.title }}</span>
                      <span class="mt-0.5 block line-clamp-2 text-xs text-slate-500">{{ notification.message }}</span>
                    </span>
                  </button>
                </div>

                <p v-else class="px-4 py-6 text-center text-sm text-slate-400">
                  No tenés notificaciones
                </p>

                <NuxtLink
                  to="/cuenta/notificaciones"
                  class="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-600 underline underline-offset-2 transition hover:text-brand-700"
                  @click="notifOpen = false"
                >
                  Ver más
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- Cart -->
          <button
            class="relative rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
            aria-label="Carrito"
            @click="goToCart"
          >
            <ShoppingCart class="h-5 w-5" />
            <span
              v-if="cart.count > 0"
              class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white"
            >
              {{ cart.count }}
            </span>
          </button>
        </div>
      </div>

      <!-- Mobile search -->
      <form class="border-t border-slate-100 px-4 py-2 lg:hidden" @submit.prevent="submitSearch">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar productos, marcas y más..."
            class="input-base !rounded-full !pl-4 !pr-11"
          />
          <button
            type="submit"
            class="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white"
            aria-label="Buscar"
          >
            <Search class="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>

    <!-- Second row -->
    <div class="hidden border-b border-slate-100 bg-slate-50/60 lg:block">
      <div class="container-torox flex h-11 items-center justify-between text-sm">
        <NuxtLink
          to="/cuenta/direcciones"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 transition hover:bg-slate-100"
        >
          <MapPin class="h-4 w-4 text-brand-600" />
          <span class="font-medium">Enviar a</span>
          <span class="text-slate-500">{{ location }}</span>
        </NuxtLink>
        <nav class="flex items-center gap-1">
          <NuxtLink to="/productos" class="rounded-lg px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-700">
            Productos
          </NuxtLink>
          <NuxtLink to="/productos?sortBy=price_asc" class="rounded-lg px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-700">
            Ofertas
          </NuxtLink>
          <NuxtLink to="/productos?isOnSale=true" class="rounded-lg px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-50">
            Ofertas del día
          </NuxtLink>
          <NuxtLink to="/carrito" class="rounded-lg px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-700">
            Mis compras
          </NuxtLink>
          <NuxtLink to="/auth/login" class="rounded-lg px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-brand-700">
            Ayuda
          </NuxtLink>
        </nav>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition name="dropdown">
      <div v-if="mobileOpen" class="border-b border-slate-100 bg-white px-4 py-4 lg:hidden">
        <nav class="flex flex-col gap-1 text-sm">
          <template v-if="!auth.isAuthenticated">
            <NuxtLink to="/auth/registro" class="rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
              Creá tu cuenta
            </NuxtLink>
            <NuxtLink to="/auth/login" class="rounded-lg px-3 py-2.5 font-semibold text-brand-700 hover:bg-brand-50" @click="mobileOpen = false">
              Ingresá
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/cuenta/perfil" class="rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
              Mi cuenta
            </NuxtLink>
            <NuxtLink to="/cuenta/compras" class="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
              Mis compras
            </NuxtLink>
            <NuxtLink to="/cuenta/favoritos" class="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
              Mis favoritos
            </NuxtLink>
            <NuxtLink to="/cuenta/notificaciones" class="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
              Notificaciones
            </NuxtLink>
            <NuxtLink v-if="auth.isAdmin" to="/admin" class="rounded-lg px-3 py-2.5 font-semibold text-brand-700 hover:bg-brand-50" @click="mobileOpen = false">
              Panel admin
            </NuxtLink>
            <button class="rounded-lg px-3 py-2.5 text-left text-red-600 hover:bg-red-50" @click="logout">
              Cerrar sesión
            </button>
          </template>
          <div class="my-2 border-t border-slate-100" />
          <NuxtLink to="/productos" class="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
            Productos
          </NuxtLink>
          <NuxtLink to="/productos?isOnSale=true" class="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50" @click="mobileOpen = false">
            Ofertas
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.18s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>