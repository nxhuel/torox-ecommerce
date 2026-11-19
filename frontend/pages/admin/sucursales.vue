<script setup lang="ts">
import { MapPin, Loader2, RefreshCw, Building2, Truck, Crosshair, AlertTriangle, Check, PersonStanding, ExternalLink } from 'lucide-vue-next'
import { shipmentsService } from '~/services'
import type { BranchInfo, BranchesMapData } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()

const mapEl = ref<HTMLElement | null>(null)
const data = ref<BranchesMapData | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const carrierFilter = ref('')
const typeFilter = ref<'3' | '1' | '2'>('3')
/** Radio de búsqueda de sucursales (km) alrededor del local de TOROX. */
const radiusKm = ref(30)

// Leaflet se carga sólo en el cliente (la app es SSR).
let L: any = null
let map: any = null
const markers: any[] = []
let pegman: any = null

const branches = computed(() => data.value?.branches ?? [])
const origin = computed(() => data.value?.origin ?? null)
/** Sucursal de origen configurada para cada paquetería. */
const originBranches = computed(() => data.value?.originBranches ?? [])

/** ¿Esta sucursal es el origen configurado de su paquetería? */
function isOrigin(branch: BranchInfo): boolean {
  return originBranches.value.some(
    (b) => b.carrier === branch.carrier && b.branchCode === branch.branchCode,
  )
}

/** Nombre legible de la paquetería de una sucursal. */
function carrierLabel(carrier: string): string {
  const found = data.value?.carriers?.find((c) => c.name === carrier)
  return found?.description || found?.name || carrier
}

onMounted(async () => {
  await loadMap()
  await load()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

async function loadMap() {
  if (!mapEl.value) return
  const leaflet = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = leaflet.default ?? leaflet

  map = L.map(mapEl.value, {
    scrollWheelZoom: true,
    zoomControl: true,
    attributionControl: true,
  }).setView([-34.704, -58.368], 15)

  // OpenStreetMap: teselas hasta nivel 19 (hasta ~1 m de detalle en la calle).
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)
}

// ─── Iconos ──────────────────────────────────────────────────────────────────

/** Pin clavo (SVG) para las sucursales y el local de TOROX. */
function pinIcon(color: string) {
  return L.divIcon({
    className: 'torox-pin',
    html: `<svg width="28" height="40" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 8.4 11 21 11 21s11-12.6 11-21C23 5.9 18.1 1 12 1z"
        fill="${color}" stroke="#ffffff" stroke-width="1.6"/>
      <circle cx="12" cy="12" r="4.3" fill="#ffffff"/>
    </svg>`,
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -38],
  })
}

/** La "personita" (pegman) para revisar una sucursal en Street View. */
function pegmanIcon() {
  return L.divIcon({
    className: 'torox-pegman',
    html: `<svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#1a73e8" stroke="#ffffff" stroke-width="0.9"
        d="M12.1 2.1a2.15 2.15 0 1 1 0 4.3 2.15 2.15 0 0 1 0-4.3zm6.9 5.9-3.9 1.4 1 4.1 2.5 2.1 1.4 5-1.8.5-1.3-4.1-2.9-1.3-1.6 3.6-2.1 1.8-.8 1.3 2.4-2.1 2.2-4.4 4.4 2.2 1 4.2 2.1 4.8 1.2 5.1-1.5 1-1.3-.3-4.8-2.7-2.9-3.8 1.6-.6-1.7 4.5-1.3 1.5-2.2 4 1.3-.4 1.2-.2-1.2-.2z"/>
    </svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

/** Panorama de Street View de Google en las coordenadas indicadas. */
function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=0&pitch=0&fll=0`
}

function openStreetView(lat: number, lng: number) {
  window.open(streetViewUrl(lat, lng), '_blank', 'noopener')
}

// ─── Datos ───────────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await shipmentsService.mapData({
      carrier: carrierFilter.value || undefined,
      type: Number(typeFilter.value) as 1 | 2 | 3,
      limit: 60,
      radiusKm: radiusKm.value,
    })
    drawMarkers()
  } catch (err: any) {
    error.value = err?.message || 'No se pudieron cargar las sucursales de Envia.com.'
  } finally {
    loading.value = false
  }
}

function drawMarkers() {
  if (!map || !L || !data.value) return

  markers.forEach((m) => m.remove())
  markers.length = 0

  const bounds: any[] = []

  // ─── Pin azul: la dirección de TOROX ───────────────────────────────────────
  const o = data.value.origin
  if (o?.latitude != null && o?.longitude != null) {
    const marker = L.marker([o.latitude, o.longitude], {
      icon: pinIcon('#2563eb'),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(
        `<div class="torox-popup">
           <p class="torox-popup__title">${escapeHtml(o.company || o.name || 'TOROX')}</p>
           <p class="torox-popup__line">${escapeHtml([o.street, o.number].filter(Boolean).join(' '))}</p>
           <p class="torox-popup__line">${escapeHtml([o.city, o.state].filter(Boolean).join(', '))} · CP ${escapeHtml(o.postalCode ?? '')}</p>
           ${o.phone ? `<p class="torox-popup__line">Tel: ${escapeHtml(o.phone)}</p>` : ''}
           ${o.email ? `<p class="torox-popup__line">${escapeHtml(o.email)}</p>` : ''}
           <p class="torox-popup__muted">Origen configurado en el .env</p>
           <a class="torox-popup__button" target="_blank" rel="noopener"
              href="${streetViewUrl(o.latitude, o.longitude)}">Ver en Street View</a>
         </div>`,
      )
    markers.push(marker)
    bounds.push([o.latitude, o.longitude])
  }

  // ─── Pines rojos: sucursales de Envia ──────────────────────────────────────
  for (const branch of branches.value) {
    const lat = branch.address?.latitude
    const lng = branch.address?.longitude
    if (lat == null || lng == null) continue

    const marker = L.marker([lat, lng], { icon: pinIcon('#dc2626') })
      .addTo(map)
      .bindPopup(branchPopup(branch))

    marker.on('popupopen', (event: any) => {
      const el = event.popup?.getElement()
      const btn = el?.querySelector('[data-set-origin]')
      if (btn) btn.addEventListener('click', () => useAsOrigin(branch))
      const clear = el?.querySelector('[data-clear-origin]')
      if (clear) clear.addEventListener('click', () => clearOrigin(branch.carrier))
      const sv = el?.querySelector('[data-street-view]')
      if (sv) sv.addEventListener('click', () => openStreetView(lat, lng))
    })

    markers.push(marker)
    bounds.push([lat, lng])
  }

  // ─── La "personita": arrastrala sobre una sucursal para ver el Street View ─
  if (pegman) {
    pegman.remove()
    pegman = null
  }
  const start = o?.latitude != null ? [o.latitude, o.longitude] : [-34.704, -58.368]
  pegman = L.marker(start, {
    icon: pegmanIcon(),
    draggable: true,
    zIndexOffset: 2000,
    title: 'Arrastrame a una sucursal para ver el Street View',
  })
    .addTo(map)
    .bindPopup(
      `<div class="torox-popup">
         <p class="torox-popup__title">Street View</p>
         <p class="torox-popup__line">Soltame sobre la sucursal que querés verificar.</p>
       </div>`,
    )

  pegman.on('dragend', (event: any) => {
    const { lat, lng } = event.target.getLatLng()
    const url = streetViewUrl(lat, lng)
    event.target
      .bindPopup(
        `<div class="torox-popup">
           <p class="torox-popup__title">Street View</p>
           <p class="torox-popup__line">${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
           <a class="torox-popup__button" target="_blank" rel="noopener" href="${url}">Abrir Street View</a>
         </div>`,
      )
      .openPopup()
    openStreetView(lat, lng)
  })

  // Encuadre bien cerrado: se puede hacer zoom hasta el nivel de calle.
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 })
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 18)
  }
}

function branchPopup(branch: BranchInfo): string {
  const addr = branch.address ?? {}
  const lines = [
    [addr.street, addr.number].filter(Boolean).join(' '),
    [addr.city, addr.state].filter(Boolean).join(', '),
    addr.postalCode ? `CP ${addr.postalCode}` : '',
  ].filter(Boolean)

  const typeLabel =
    branch.type === 'BOTH'
      ? 'Admite y entrega'
      : branch.type === 'ORIGIN'
        ? 'Admite paquetes'
        : 'Entrega a domicilio'

  const isOriginBranch = isOrigin(branch)

  return `<div class="torox-popup">
      <p class="torox-popup__title">${escapeHtml(branch.reference || branch.branchCode)}</p>
      <p class="torox-popup__line">${escapeHtml(branch.carrierName || branch.carrier)}</p>
      ${lines.map((l) => `<p class="torox-popup__line">${escapeHtml(l)}</p>`).join('')}
      ${branch.distanceKm != null ? `<p class="torox-popup__line">A ${branch.distanceKm.toFixed(1)} km</p>` : ''}
      ${branch.phone ? `<p class="torox-popup__line">Tel: ${escapeHtml(branch.phone)}</p>` : ''}
      ${branch.hours ? `<p class="torox-popup__line">${escapeHtml(formatHours(branch.hours))}</p>` : ''}
      <p class="torox-popup__muted">${typeLabel} · ${escapeHtml(branch.branchCode)}</p>
      ${
        isOriginBranch
          ? `<p class="torox-popup__origin">★ Origen de ${escapeHtml(carrierLabel(branch.carrier))}</p>
             <button type="button" data-clear-origin class="torox-popup__button torox-popup__button--danger">Quitar como origen</button>`
          : `<button type="button" data-set-origin class="torox-popup__button">Usar como origen de ${escapeHtml(carrierLabel(branch.carrier))}</button>`
      }
      <button type="button" data-street-view class="torox-popup__button torox-popup__button--ghost">Ver en Street View</button>
    </div>`
}

function formatHours(hours: unknown): string {
  if (!hours) return ''
  if (typeof hours === 'string') return hours
  if (Array.isArray(hours)) {
    return hours
      .map((h: any) => {
        if (typeof h === 'string') return h
        if (h && typeof h === 'object') {
          const day = h.day ?? h.name ?? ''
          const open = h.open ?? h.from ?? ''
          const close = h.close ?? h.to ?? ''
          return [day, open, close].filter(Boolean).join(' ')
        }
        return ''
      })
      .filter(Boolean)
      .join(' · ')
  }
  if (typeof hours === 'object') {
    return Object.entries(hours as Record<string, string>)
      .map(([day, range]) => `${day} ${range}`)
      .join(' · ')
  }
  return ''
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Acciones ────────────────────────────────────────────────────────────────

async function useAsOrigin(branch: BranchInfo) {
  saving.value = true
  try {
    await shipmentsService.setOriginBranch(branch)
    toast.success(
      `Origen de ${carrierLabel(branch.carrier)}: ${branch.reference || branch.branchCode}`,
    )
    await load()
  } catch (err: any) {
    toast.error(err?.message || 'No se pudo guardar la sucursal de origen')
  } finally {
    saving.value = false
  }
}

/** Quita el origen de una paquetería (vuelve a la dirección del .env para ella). */
async function clearOrigin(carrier?: string) {
  if (
    !carrier &&
    !window.confirm(
      '¿Quitar TODAS las sucursales de origen?\n\nSin origen configurado no se pueden cotizar entregas a domicilio y los compradores no podrán comprar.',
    )
  ) {
    return
  }
  saving.value = true
  try {
    await shipmentsService.clearOriginBranch(carrier)
    toast.success(
      carrier
        ? `${carrierLabel(carrier)} vuelve a salir de la dirección del .env`
        : 'Se volvió a usar la dirección del .env como origen',
    )
    await load()
  } catch (err: any) {
    toast.error(err?.message || 'No se pudo limpiar la sucursal de origen')
  } finally {
    saving.value = false
  }
}

function focusOrigin() {
  if (!map || !origin.value?.latitude) return
  map.setView([origin.value.latitude, origin.value.longitude ?? 0], 18)
}

function focusBranch(branch: BranchInfo) {
  if (!map) return
  const lat = branch.address?.latitude
  const lng = branch.address?.longitude
  if (lat == null || lng == null) return
  map.setView([lat, lng], 18)
}

function streetView(branch: BranchInfo) {
  const lat = branch.address?.latitude
  const lng = branch.address?.longitude
  if (lat == null || lng == null) return
  openStreetView(lat, lng)
}

function branchAddress(branch: BranchInfo): string {
  const addr = branch.address ?? {}
  return [addr.street, addr.number, addr.city].filter(Boolean).join(', ')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Sucursales de Envia.com</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="data?.environment?.isSandbox"
          class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          <AlertTriangle class="h-3.5 w-3.5" /> Sandbox (api-test.envia.com)
        </span>
        <button class="btn-secondary" :disabled="loading" @click="load">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" />
          Actualizar
        </button>
      </div>
    </div>

    <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </p>
    <!-- Filtros -->
    <div class="card flex flex-wrap items-end gap-4 p-4">
      <div class="min-w-[200px] flex-1">
        <label class="label-base" for="carrierFilter">Paquetería</label>
        <select id="carrierFilter" v-model="carrierFilter" class="input-base" @change="load">
          <!-- TOROX trabaja sólo con Correo Argentino: si hay un único correo
               habilitado se muestra sólo ese, sin la opción "Todas". -->
          <template v-if="(data?.carriers?.length ?? 0) === 1">
            <option value="">{{ data!.carriers[0].description || data!.carriers[0].name }}</option>
          </template>
          <template v-else>
            <option value="">Todas las configuradas</option>
            <option v-for="carrier in data?.carriers ?? []" :key="carrier.id" :value="carrier.name">
              {{ carrier.description || carrier.name }}
            </option>
          </template>
        </select>
      </div>
      <div class="min-w-[200px] flex-1">
        <label class="label-base" for="typeFilter">Tipo de sucursal</label>
        <select id="typeFilter" v-model="typeFilter" class="input-base" @change="load">
          <option value="3">Admisión y entrega</option>
          <option value="1">Solo admisión (dejar paquetes)</option>
          <option value="2">Solo entrega (retiro del comprador)</option>
        </select>
      </div>
      <div class="min-w-[180px] flex-1">
        <label class="label-base" for="radiusFilter">Radio de búsqueda</label>
        <select id="radiusFilter" v-model.number="radiusKm" class="input-base" @change="load">
          <option :value="5">5 km</option>
          <option :value="15">15 km</option>
          <option :value="30">30 km</option>
          <option :value="100">100 km</option>
          <option :value="2000">Todo el país</option>
        </select>
      </div>
      <div class="text-xs text-slate-500">
        <p>
          {{ branches.length }} sucursales
          <template v-if="data?.totalBranches && data.totalBranches > branches.length">
            de {{ data.totalBranches }} (dentro de {{ data.radiusKm }} km)
          </template>
        </p>
        <p v-if="data?.configuredCarriers?.length" class="mt-0.5">
          Carriers configurados: {{ data.configuredCarriers.join(', ') }}
        </p>
      </div>
    </div>

    <!-- Origen por paquetería -->
    <div class="card border-brand-200 bg-brand-50/40 p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <Building2 class="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <p class="text-sm font-semibold text-slate-800">Origen de los envíos</p>
            <p class="mt-0.5 text-xs text-slate-500">
              Dejás el paquete en esta sucursal con la etiqueta y desde ahí la paquetería lo lleva a la
              casa del comprador. Cada paquetería tiene su propia sucursal: el código de sucursal de
              OCA no sirve para un envío de Andreani.
            </p>
          </div>
        </div>
        <button
          v-if="originBranches.length"
          class="btn-secondary"
          :disabled="saving"
          @click="clearOrigin()"
        >
          Volver a la dirección del .env
        </button>
      </div>

      <ul v-if="originBranches.length" class="mt-4 space-y-2">
        <li
          v-for="branch in originBranches"
          :key="`${branch.carrier}-${branch.branchCode}`"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800">
              {{ carrierLabel(branch.carrier) }}
              <span class="ml-1 font-normal text-slate-500">({{ branch.carrier }})</span>
            </p>
            <p class="text-xs text-slate-500">
              {{ branch.reference || branch.branchCode }} · {{ branchAddress(branch) }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button
              class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
              @click="focusBranch(branch)"
            >
              <Crosshair class="h-3.5 w-3.5" /> Ver en el mapa
            </button>
            <button
              class="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
              :disabled="saving"
              @click="clearOrigin(branch.carrier)"
            >
              Quitar
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <strong>No hay ninguna sucursal de origen configurada.</strong> Sin ella no se pueden cotizar
        envíos: elegí una sucursal del mapa y tocá <strong>“Usar como origen de …”</strong> para cada
        paquetería que quieras ofrecer. El paquete se deja ahí y desde ahí la paquetería lo lleva a la
        casa del comprador.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <!-- Mapa -->
      <div class="card overflow-hidden p-0">
        <div ref="mapEl" class="h-[560px] w-full" />
      </div>

      <!-- Listado -->
      <div class="card flex max-h-[560px] flex-col p-0">
        <div class="border-b border-slate-100 p-4">
          <h2 class="text-base font-bold text-slate-900">Sucursales cercanas</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Ordenadas por distancia a la dirección de TOROX.
          </p>
        </div>

        <!-- Tarjeta del local de TOROX -->
        <div v-if="origin" class="border-b border-slate-100 bg-blue-50/50 p-4">
          <div class="flex items-start gap-3">
            <svg width="22" height="30" viewBox="0 0 24 34" class="mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1C5.9 1 1 5.9 1 12c0 8.4 11 21 11 21s11-12.6 11-21C23 5.9 18.1 1 12 1z"
                fill="#2563eb" stroke="#ffffff" stroke-width="1.6" />
              <circle cx="12" cy="12" r="4.3" fill="#ffffff" />
            </svg>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-800">{{ origin.company || origin.name }}</p>
              <p class="text-xs text-slate-600">
                {{ [origin.street, origin.number].filter(Boolean).join(' ') }},
                {{ origin.city }} · CP {{ origin.postalCode }}
              </p>
              <p v-if="origin.phone" class="text-xs text-slate-500">Tel: {{ origin.phone }}</p>
              <p v-if="origin.email" class="text-xs text-slate-500">{{ origin.email }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                <button class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                  @click="focusOrigin">
                  <Crosshair class="h-3.5 w-3.5" /> Ver en el mapa
                </button>
                <button
                  v-if="origin.latitude != null"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                  @click="openStreetView(origin.latitude, origin.longitude ?? 0)">
                  <ExternalLink class="h-3.5 w-3.5" /> Street View
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 space-y-2 overflow-y-auto p-3">
          <div v-if="loading" class="flex items-center gap-2 p-4 text-sm text-slate-500">
            <Loader2 class="h-4 w-4 animate-spin" /> Buscando sucursales...
          </div>

          <div v-else-if="!branches.length" class="p-4 text-sm text-slate-500">
            No se encontraron sucursales con esos filtros.
          </div>

          <div v-for="branch in branches" :key="`${branch.carrier}-${branch.branchCode}`"
            class="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-slate-800">
                {{ branch.reference || branch.branchCode }}
              </p>
              <span v-if="branch.distanceKm != null"
                class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {{ branch.distanceKm.toFixed(1) }} km
              </span>
            </div>
            <p class="mt-0.5 text-xs text-slate-500">{{ branchAddress(branch) }}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                <Truck class="h-3 w-3" /> {{ branch.carrierName || branch.carrier }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px]"
                :class="branch.type === 'DESTINATION' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'">
                {{ branch.type === 'BOTH' ? 'Admite y entrega' : branch.type === 'ORIGIN' ? 'Admite' : 'Entrega' }}
              </span>
              <span
                v-if="isOrigin(branch)"
                class="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                ★ Origen
              </span>
            </div>
            <p v-if="branch.phone" class="mt-1 text-xs text-slate-500">Tel: {{ branch.phone }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <span
                class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                @click="focusBranch(branch)">
                <MapPin class="h-3.5 w-3.5" /> Ver en el mapa
              </span>
              <span
                v-if="branch.address?.latitude != null"
                class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                @click="streetView(branch)">
                <ExternalLink class="h-3.5 w-3.5" /> Street View
              </span>
              <span
                v-if="!isOrigin(branch)"
                class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                @click="useAsOrigin(branch)">
                <MapPin class="h-3.5 w-3.5" /> Usar como origen de {{ carrierLabel(branch.carrier) }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                @click="clearOrigin(branch.carrier)">
                Quitar como origen
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Marcadores del mapa (inyectados por Leaflet fuera del scope del componente). */
.torox-pin {
  background: transparent;
  border: 0;
}

.torox-pegman {
  background: transparent;
  border: 0;
  cursor: grab;
}

.torox-pegman:active {
  cursor: grabbing;
}

.torox-popup__title {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}

.torox-popup__line {
  font-size: 12px;
  color: #334155;
  margin-top: 2px;
}

.torox-popup__muted {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

.torox-popup__origin {
  font-size: 12px;
  font-weight: 700;
  color: #ea580c;
  margin-top: 6px;
}

.torox-popup__button--danger {
  background: #dc2626;
}

.torox-popup__button--danger:hover {
  background: #b91c1c;
}

.torox-popup__button {
  display: block;
  margin-top: 8px;
  width: 100%;
  text-align: center;
  border-radius: 8px;
  background: #ea580c;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 8px;
  cursor: pointer;
}

.torox-popup__button:hover {
  background: #c2410c;
}

.torox-popup__button--ghost {
  background: #2563eb;
}

.torox-popup__button--ghost:hover {
  background: #1d4ed8;
}
</style>
