<script setup lang="ts">
import { Plus, Pencil, Trash2, Search, Loader2, Package, Star } from 'lucide-vue-next'
import type { Category, Product } from '~/types'
import { categoriesService, productsService } from '~/services'
import { useFormat } from '~/composables/useFormat'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { currency } = useFormat()
const toast = useToast()

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const limit = 12

const showModal = ref(false)
const editing = ref<Product | null>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  brand: '',
  categoryId: '',
  price: 0,
  originalPrice: null as number | null,
  discountPercentage: null as number | null,
  cost: null as number | null,
  stock: 0,
  shortDescription: '',
  description: '',
  images: [] as string[],
  imageInput: '',
  specificationsText: '',
  isFeatured: false,
  isOnSale: false,
  isActive: true,
})

onMounted(async () => {
  const [cats] = await Promise.all([categoriesService.all()])
  categories.value = cats
  await load()
})

watch(search, () => {
  page.value = 1
  load()
})

async function load() {
  loading.value = true
  try {
    const result = await productsService.all({
      search: search.value || undefined,
      page: page.value,
      limit,
    })
    products.value = result.items
    totalPages.value = result.meta?.totalPages || 1
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    name: '',
    brand: '',
    categoryId: '',
    price: 0,
    originalPrice: null,
    discountPercentage: null,
    cost: null,
    stock: 0,
    shortDescription: '',
    description: '',
    images: [],
    imageInput: '',
    specificationsText: '',
    isFeatured: false,
    isOnSale: false,
    isActive: true,
  })
  showModal.value = true
}

function openEdit(product: Product) {
  editing.value = product
  Object.assign(form, {
    name: product.name,
    brand: product.brand || '',
    categoryId: product.categoryId,
    price: Number(product.price),
    originalPrice: product.originalPrice != null ? Number(product.originalPrice) : null,
    discountPercentage: product.discountPercentage != null ? Number(product.discountPercentage) : null,
    cost: product.cost != null ? Number(product.cost) : null,
    stock: product.stock,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    images: [...(product.images || [])],
    imageInput: '',
    specificationsText: product.specifications ? Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
    isFeatured: product.isFeatured,
    isOnSale: product.isOnSale,
    isActive: product.isActive,
  })
  showModal.value = true
}

function addImage() {
  const url = form.imageInput.trim()
  if (url) {
    form.images.push(url)
    form.imageInput = ''
  }
}

function removeImage(index: number) {
  form.images.splice(index, 1)
}

async function save() {
  if (!form.name || !form.categoryId || !form.price) {
    toast.error('Completá nombre, categoría y precio')
    return
  }
  saving.value = true
  const specs: Record<string, string> = {}
  form.specificationsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, ...rest] = line.split(':')
      if (key && rest.length) specs[key.trim()] = rest.join(':').trim()
    })

  const payload = {
    name: form.name,
    brand: form.brand || undefined,
    categoryId: form.categoryId,
    price: Number(form.price),
    originalPrice: form.originalPrice != null ? Number(form.originalPrice) : undefined,
    discountPercentage: form.discountPercentage != null ? Number(form.discountPercentage) : undefined,
    cost: form.cost != null ? Number(form.cost) : undefined,
    stock: Number(form.stock),
    shortDescription: form.shortDescription || undefined,
    description: form.description || undefined,
    images: form.images.length ? form.images : undefined,
    specifications: Object.keys(specs).length ? specs : undefined,
    isFeatured: form.isFeatured,
    isOnSale: form.isOnSale,
    isActive: form.isActive,
  }

  try {
    if (editing.value) {
      await productsService.update(editing.value.id, payload)
      toast.success('Producto actualizado')
    } else {
      await productsService.create(payload)
      toast.success('Producto creado')
    }
    showModal.value = false
    await load()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function remove(product: Product) {
  if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return
  try {
    await productsService.remove(product.id)
    toast.success('Producto eliminado')
    await load()
  } catch (error: any) {
    toast.error(error.message)
  }
}

function categoryName(id: string) {
  return categories.value.find((c) => c.id === id)?.name || '—'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Productos</h2>
        <p class="text-sm text-slate-500">{{ products.length }} mostrados</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <Plus class="h-4 w-4" /> Nuevo producto
      </button>
    </div>

    <div class="relative max-w-sm">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input v-model="search" class="input-base !pl-9" placeholder="Buscar producto..." />
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="space-y-3 p-6">
        <BaseSkeleton v-for="i in 6" :key="i" class="h-14" />
      </div>
      <div v-else-if="products.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-4 py-3">Producto</th>
              <th class="px-4 py-3">Categoría</th>
              <th class="px-4 py-3">Precio</th>
              <th class="px-4 py-3">Stock</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id" class="border-b border-slate-50 transition hover:bg-slate-50/50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <AppImage :src="product.images?.[0]" :alt="product.name" :seed="product.slug" class="h-full w-full" />
                  </div>
                  <div class="min-w-0">
                    <p class="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span class="truncate max-w-[220px]">{{ product.name }}</span>
                      <Star v-if="product.isFeatured" class="h-3.5 w-3.5 shrink-0 text-amber-500" fill="currentColor" />
                    </p>
                    <p class="text-xs text-slate-400">{{ product.brand || '—' }} • {{ product.sku }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ categoryName(product.categoryId) }}</td>
              <td class="px-4 py-3">
                <p class="font-bold text-slate-900">{{ currency(product.finalPrice) }}</p>
                <p v-if="product.originalPrice" class="text-xs text-slate-400 line-through">{{ currency(product.originalPrice) }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="font-bold" :class="product.stock === 0 ? 'text-red-600' : product.stock <= 5 ? 'text-amber-600' : 'text-slate-800'">
                  {{ product.stock }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ product.isActive ? 'Activo' : 'Inactivo' }}
                </span>
                <span v-if="product.isOnSale" class="ml-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  Oferta
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button class="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600" aria-label="Editar" @click="openEdit(product)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Eliminar" @click="remove(product)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <EmptyState v-else icon="package" title="No hay productos" description="Creá tu primer producto para empezar a vender.">
        <button class="btn-primary" @click="openCreate"><Plus class="h-4 w-4" /> Nuevo producto</button>
      </EmptyState>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <button
        v-for="p in totalPages"
        :key="p"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
        :class="p === page ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'"
        @click="page = p; load()"
      >
        {{ p }}
      </button>
    </div>

    <!-- Modal -->
    <BaseModal :open="showModal" :title="editing ? 'Editar producto' : 'Nuevo producto'" size="lg" @close="showModal = false">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label class="label-base">Nombre *</label>
          <input v-model="form.name" class="input-base" placeholder="Cámara IP WiFi 2K" />
        </div>
        <div>
          <label class="label-base">Marca</label>
          <input v-model="form.brand" class="input-base" placeholder="Hikvision" />
        </div>
        <div>
          <label class="label-base">Categoría *</label>
          <select v-model="form.categoryId" class="input-base">
            <option value="">Seleccionar...</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
            <template v-for="category in categories" :key="category.id">
              <option v-for="child in category.children || []" :key="child.id" :value="child.id">
                {{ category.name }} › {{ child.name }}
              </option>
            </template>
          </select>
        </div>
        <div>
          <label class="label-base">Precio *</label>
          <input v-model.number="form.price" type="number" min="0" class="input-base" />
        </div>
        <div>
          <label class="label-base">Precio anterior</label>
          <input v-model.number="form.originalPrice" type="number" min="0" class="input-base" />
        </div>
        <div>
          <label class="label-base">Descuento %</label>
          <input v-model.number="form.discountPercentage" type="number" min="0" max="100" class="input-base" />
        </div>
        <div>
          <label class="label-base">Costo</label>
          <input v-model.number="form.cost" type="number" min="0" class="input-base" />
        </div>
        <div>
          <label class="label-base">Stock</label>
          <input v-model.number="form.stock" type="number" min="0" class="input-base" />
        </div>
        <div class="sm:col-span-2">
          <label class="label-base">Descripción corta</label>
          <input v-model="form.shortDescription" class="input-base" />
        </div>
        <div class="sm:col-span-2">
          <label class="label-base">Descripción</label>
          <textarea v-model="form.description" rows="3" class="input-base" />
        </div>
        <div class="sm:col-span-2">
          <label class="label-base">Imágenes</label>
          <div class="flex gap-2">
            <input v-model="form.imageInput" class="input-base" placeholder="https://..." @keydown.enter.prevent="addImage" />
            <button class="btn-secondary shrink-0" @click="addImage">Agregar</button>
          </div>
          <div v-if="form.images.length" class="mt-2 flex flex-wrap gap-2">
            <div v-for="(image, index) in form.images" :key="index" class="relative">
              <AppImage :src="image" :alt="`imagen ${index + 1}`" class="h-16 w-16 rounded-lg border border-slate-200" />
              <button class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white" aria-label="Quitar" @click="removeImage(index)">
                <Trash2 class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        <div class="sm:col-span-2">
          <label class="label-base">Especificaciones (formato: clave: valor, una por línea)</label>
          <textarea v-model="form.specificationsText" rows="3" class="input-base font-mono !text-xs" placeholder="Resolución: 4MP&#10;Visibilidad nocturna: 30m" />
        </div>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input v-model="form.isFeatured" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Producto destacado
        </label>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input v-model="form.isOnSale" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-red-600" />
          En oferta
        </label>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Activo
        </label>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Package v-else class="h-4 w-4" />
          {{ editing ? 'Guardar cambios' : 'Crear producto' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>