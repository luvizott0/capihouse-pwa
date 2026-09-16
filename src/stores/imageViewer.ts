import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ImageViewerItem {
  url: string
  title?: string
  subtitle?: string
}

export const useImageViewerStore = defineStore('imageViewer', () => {
  const isOpen = ref(false)
  const items = ref<ImageViewerItem[]>([])
  const currentIndex = ref(0)

  const currentItem = computed<ImageViewerItem | null>(() => {
    if (!items.value.length || currentIndex.value < 0 || currentIndex.value >= items.value.length) {
      return null
    }
    return items.value[currentIndex.value] ?? null
  })

  function openImage(url: string, title?: string, subtitle?: string) {
    if (!url) return
    items.value = [{ url, title, subtitle }]
    currentIndex.value = 0
    isOpen.value = true
  }

  function openGallery(galleryItems: ImageViewerItem[], startIndex = 0) {
    if (!galleryItems || !galleryItems.length) return
    items.value = galleryItems
    currentIndex.value = Math.max(0, Math.min(startIndex, galleryItems.length - 1))
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    items.value = []
    currentIndex.value = 0
  }

  function next() {
    if (currentIndex.value < items.value.length - 1) {
      currentIndex.value++
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  function goTo(index: number) {
    if (index >= 0 && index < items.value.length) {
      currentIndex.value = index
    }
  }

  return {
    isOpen,
    items,
    currentIndex,
    currentItem,
    openImage,
    openGallery,
    close,
    next,
    prev,
    goTo,
  }
})
