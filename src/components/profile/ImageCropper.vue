<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
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
}>()

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
      maxWidth: props.maxWidth || 2048,
      maxHeight: props.maxHeight || 2048,
    })
    canvas.toBlob((blob: Blob | null) => {
      if (blob) {
        emit('cropped', blob)
        handleClose()
      }
    }, 'image/jpeg', 0.88)
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
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <input type="file" accept="image/*" @change="onFileSelect" class="retro-input" />
      <div v-if="selectedImage" style="max-height: 400px; overflow: hidden; background: #eee;">
        <img ref="imageEl" :src="selectedImage" style="max-width: 100%; display: block;" />
      </div>
      <div v-if="selectedImage" style="display: flex; justify-content: flex-end; gap: 1rem;">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton @click="handleCrop">Cortar e Salvar</RetroButton>
      </div>
    </div>
  </RetroModal>
</template>
