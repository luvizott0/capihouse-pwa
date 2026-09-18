<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.min.css'

const props = defineProps<{
  modelValue: boolean
  aspectRatio?: number | null
  title?: string
  initialImage?: string | null
  maxWidth?: number
  maxHeight?: number
  formatNote?: string
}>()

const formatBadge = computed(() => {
  if (props.formatNote) return props.formatNote
  if (props.aspectRatio && props.aspectRatio > 1.2) {
    return 'Formato retangular recomendado (corte panorâmico)'
  }
  if (props.aspectRatio === 1) {
    return 'Formato quadrado (1:1)'
  }
  return null
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cropped', blob: Blob): void
}>()

const imageEl = ref<HTMLImageElement | null>(null)
const selectedImage = ref<string | null>(null)
let cropperInstance: Cropper | null = null

function initCropper() {
  setTimeout(() => {
    if (imageEl.value) {
      if (cropperInstance) cropperInstance.destroy()
      const ratio = props.aspectRatio === 0 || props.aspectRatio === null ? NaN : (props.aspectRatio ?? 1)
      cropperInstance = new Cropper(imageEl.value, {
        aspectRatio: ratio,
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
      } as Cropper.Options)
    }
  }, 100)
}

watch(() => props.modelValue, (open) => {
  if (open && props.initialImage) {
    selectedImage.value = props.initialImage
    initCropper()
  } else if (!open) {
    handleClose()
  }
})

function onFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    selectedImage.value = URL.createObjectURL(file)
    initCropper()
  }
}

function handleCrop() {
  if (cropperInstance) {
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: props.maxWidth || 1200,
      maxHeight: props.maxHeight || 1200,
      imageSmoothingQuality: 'high',
    })
    canvas.toBlob((blob: Blob | null) => {
      if (blob) {
        emit('cropped', blob)
        handleClose()
      }
    }, 'image/webp', 0.85)
  }
}

function handleClose() {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  selectedImage.value = null
  emit('update:modelValue', false)
}

onBeforeUnmount(() => {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
})
</script>
<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" :title="title || 'Cortar Imagem'" size="lg">
    <div class="cropper-body">
      <div v-if="formatBadge" class="format-indicator-banner">
        <span class="format-icon">📐</span>
        <span>{{ formatBadge }}</span>
      </div>
      <input type="file" accept="image/*" @change="onFileSelect" class="retro-file-input" />
      <div v-if="selectedImage" class="preview-crop-container">
        <img ref="imageEl" :src="selectedImage" class="crop-image" />
      </div>
      <div v-if="selectedImage" class="cropper-actions">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton @click="handleCrop">Cortar e Salvar</RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.cropper-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.format-indicator-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px dashed var(--color-primary-300, #c4884e);
  border-radius: 2px;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.format-icon {
  font-size: 1rem;
}

.retro-file-input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  background-color: #ffffff;
  border-radius: 2px;
}

.preview-crop-container {
  max-height: 400px;
  overflow: hidden;
  background: #2b241e;
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.crop-image {
  max-width: 100%;
  display: block;
}

.cropper-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
