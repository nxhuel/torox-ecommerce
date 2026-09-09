<script setup lang="ts">
import { Plus, Pencil, Trash2, Loader2, FolderTree, ChevronRight, ImagePlus, LoaderCircle } from 'lucide-vue-next'
import type { Category } from '~/types'
import { categoriesService, uploadsService } from '~/services'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const toast = useToast()
const categories = ref<Category[]>([])
const loading = ref(true)

const showModal = ref(false)
const editing = ref<Category | null>(null)
const saving = ref(false)
const uploading = ref(false)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const form = reactive({
  name: '',
  description: '',
  imageUrl: '',
  parentId: '' as string,
  sortOrder: 0,
  isActive: true,
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    categories.value = await categoriesService.all()
  } finally {
    loading.value = false
  }
}

function openCreate(parentId = '') {
  editing.value = null
  Object.assign(form, {
    name: '',
    description: '',
    imageUrl: '',
    parentId,
    sortOrder: 0,
    isActive: true,
  })
  showModal.value = true
}

function openEdit(category: Category) {
  editing.value = category
  Object.assign(form, {
    name: category.name,
    description: category.description || '',
    imageUrl: category.imageUrl || '',
    parentId: category.parentId || '',
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  })
  showModal.value = true
}

async function uploadFiles(files: File[]) {
  const valid = files.filter((f) => f.type.startsWith('image/'))
  if (!valid.length) {
    toast.error('Arrastrá o pegá imágenes (JPG, PNG, WebP...)')
    return
  }
  uploading.value = true
  try {
    const urls = await uploadsService.images(valid.slice(0, 1))
    form.imageUrl = urls[0]
    toast.success('Imagen subida')
  } catch (error: any) {
    toast.error(error.message || 'No se pudo subir la imagen')
  } finally {
    uploading.value = false
  }
}

function onFilePick(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) uploadFiles(files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  if (files.length) uploadFiles(files)
}

function onGlobalPaste(event: ClipboardEvent) {
  if (!showModal.value) return
  const files = Array.from(event.clipboardData?.files || [])
  if (files.length) {
    event.preventDefault()
    uploadFiles(files)
  }
}

watch(showModal, (open) => {
  if (open) window.addEventListener('paste', onGlobalPaste)
  else window.removeEventListener('paste', onGlobalPaste)
})
onUnmounted(() => window.removeEventListener('paste', onGlobalPaste))

async function save() {
  if (!form.name) {
    toast.error('El nombre es obligatorio')
    return
  }
  saving.value = true
  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description || undefined,
    imageUrl: form.imageUrl || undefined,
    parentId: form.parentId || undefined,
    sortOrder: Number(form.sortOrder),
    isActive: form.isActive,
  }
  try {
    if (editing.value) {
      await categoriesService.update(editing.value.id, payload)
      toast.success('Categoría actualizada')
    } else {
      await categoriesService.create(payload)
      toast.success('Categoría creada')
    }
    showModal.value = false
    await load()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    saving.value = false
  }
}

async function remove(category: Category) {
  const name = category.name
  if (!confirm(`¿Eliminar la categoría "${name}"?`)) return
  try {
    await categoriesService.remove(category.id)
    toast.success('Categoría eliminada')
    await load()
  } catch (error: any) {
    toast.error(error.message)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Categorías</h2>
        <p class="text-sm text-slate-500">Organizá el catálogo con categorías y subcategorías</p>
      </div>
      <button class="btn-primary" @click="openCreate()">
        <Plus class="h-4 w-4" /> Nueva categoría
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <BaseSkeleton v-for="i in 5" :key="i" class="h-16" />
    </div>

    <div v-else-if="categories.length" class="space-y-4">
      <div v-for="category in categories" :key="category.id" class="card overflow-hidden">
        <div class="flex items-center gap-4 p-4">
          <div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            <AppImage :src="category.imageUrl" :alt="category.name" :seed="category.slug" class="h-full w-full" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-slate-900">{{ category.name }}</p>
            <p v-if="category.description" class="truncate text-xs text-slate-400">{{ category.description }}</p>
          </div>
          <span class="hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:block" :class="category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
            {{ category.isActive ? 'Activa' : 'Inactiva' }}
          </span>
          <div class="flex gap-1">
            <button class="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600" aria-label="Editar" @click="openEdit(category)">
              <Pencil class="h-4 w-4" />
            </button>
            <button class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Eliminar" @click="remove(category)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div v-if="category.children?.length" class="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <div class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <ChevronRight class="h-3.5 w-3.5" /> Subcategorías ({{ category.children.length }})
          </div>
          <div class="space-y-2">
            <div v-for="child in category.children" :key="child.id" class="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
              <FolderTree class="h-4 w-4 shrink-0 text-slate-300" />
              <span class="flex-1 text-sm font-medium text-slate-700">{{ child.name }}</span>
              <div class="flex gap-1">
                <button class="rounded p-1.5 text-slate-400 hover:text-brand-600" aria-label="Editar" @click="openEdit(child)">
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button class="rounded p-1.5 text-slate-400 hover:text-red-600" aria-label="Eliminar" @click="remove(child)">
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          <button class="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700" @click="openCreate(category.id)">
            <Plus class="h-4 w-4" /> Agregar subcategoría
          </button>
        </div>

        <div v-else class="border-t border-slate-100 px-4 py-2.5">
          <button class="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700" @click="openCreate(category.id)">
            <Plus class="h-4 w-4" /> Agregar subcategoría
          </button>
        </div>
      </div>
    </div>

    <EmptyState v-else icon="package" title="No hay categorías" description="Creá tu primera categoría para organizar los productos.">
      <button class="btn-primary" @click="openCreate()"><Plus class="h-4 w-4" /> Nueva categoría</button>
    </EmptyState>

    <BaseModal :open="showModal" :title="editing ? 'Editar categoría' : 'Nueva categoría'" @close="showModal = false">
      <div class="grid gap-4">
        <div>
          <label class="label-base">Nombre *</label>
          <input v-model="form.name" class="input-base" placeholder="Cámaras" />
        </div>
        <div>
          <label class="label-base">Descripción</label>
          <textarea v-model="form.description" rows="2" class="input-base" />
        </div>
        <div>
          <label class="label-base">Imagen</label>
          <div
            class="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition"
            :class="dragOver ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'"
            @click="fileInput?.click()"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <LoaderCircle v-if="uploading" class="h-7 w-7 animate-spin text-brand-600" />
            <template v-else-if="form.imageUrl">
              <AppImage :src="form.imageUrl" alt="Imagen de la categoría" class="h-16 w-16 rounded-lg" />
              <p class="text-xs text-slate-400">Hacé clic para reemplazarla, arrastrala o pegala con Ctrl + V</p>
            </template>
            <template v-else>
              <ImagePlus class="h-7 w-7 text-slate-400" />
              <p class="text-sm font-medium text-slate-600">Hacé clic, arrastrá o pegá la imagen con Ctrl + V</p>
            </template>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFilePick" />
          </div>
        </div>
        <div>
          <label class="label-base">Categoría padre</label>
          <select v-model="form.parentId" class="input-base">
            <option value="">Ninguna (categoría principal)</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label-base">Orden</label>
          <input v-model.number="form.sortOrder" type="number" class="input-base" />
        </div>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600" />
          Categoría activa
        </label>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showModal = false">Cancelar</button>
        <button class="btn-primary" :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <FolderTree v-else class="h-4 w-4" />
          {{ editing ? 'Guardar' : 'Crear' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>