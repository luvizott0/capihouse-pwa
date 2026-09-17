<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useImageViewerStore } from '@/stores/imageViewer'

const imageViewer = useImageViewerStore()

// Zoom and Pan state
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const rotation = ref(0)

// Dragging state
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panStartX = ref(0)
const panStartY = ref(0)

// Touch / Pinch state
const initialPinchDistance = ref<number | null>(null)
const initialPinchZoom = ref(1)
const touchStartX = ref(0)
const touchStartY = ref(0)

const MIN_ZOOM = 0.5
const MAX_ZOOM = 5

function resetTransform() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  rotation.value = 0
}

// Reset when image changes or modal opens
watch(
  () => [imageViewer.currentIndex, imageViewer.isOpen],
  () => {
    resetTransform()
  }
)

// Body scroll locking
watch(
  () => imageViewer.isOpen,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, Math.round((zoom.value + 0.3) * 10) / 10)
}

function zoomOut() {
  const newZoom = Math.max(MIN_ZOOM, Math.round((zoom.value - 0.3) * 10) / 10)
  zoom.value = newZoom
  if (newZoom <= 1) {
    panX.value = 0
    panY.value = 0
  }
}

function toggleZoom() {
  if (zoom.value > 1.05) {
    resetTransform()
  } else {
    zoom.value = 2.5
    panX.value = 0
    panY.value = 0
  }
}

function rotate() {
  rotation.value = (rotation.value + 90) % 360
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// Mouse drag (pan)
function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return // Only primary click
  if (zoom.value <= 1) return

  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  panStartX.value = panX.value
  panStartY.value = panY.value
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  panX.value = panStartX.value + dx
  panY.value = panStartY.value + dy
}

function handleMouseUp() {
  isDragging.value = false
}

// Touch Handling (Pinch-to-zoom & Swipe)
function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // Start pinch
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    if (t0 && t1) {
      initialPinchDistance.value = getTouchDistance(t0, t1)
      initialPinchZoom.value = zoom.value
    }
  } else if (e.touches.length === 1) {
    const t0 = e.touches[0]
    if (!t0) return
    touchStartX.value = t0.clientX
    touchStartY.value = t0.clientY
    if (zoom.value > 1) {
      isDragging.value = true
      dragStartX.value = t0.clientX
      dragStartY.value = t0.clientY
      panStartX.value = panX.value
      panStartY.value = panY.value
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && initialPinchDistance.value !== null) {
    e.preventDefault()
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    if (t0 && t1) {
      const currentDist = getTouchDistance(t0, t1)
      const ratio = currentDist / initialPinchDistance.value
      const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialPinchZoom.value * ratio))
      zoom.value = Math.round(targetZoom * 100) / 100
    }
  } else if (e.touches.length === 1 && isDragging.value && zoom.value > 1) {
    const t0 = e.touches[0]
    if (!t0) return
    const dx = t0.clientX - dragStartX.value
    const dy = t0.clientY - dragStartY.value
    panX.value = panStartX.value + dx
    panY.value = panStartY.value + dy
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (initialPinchDistance.value !== null && e.touches.length < 2) {
    initialPinchDistance.value = null
  }

  if (isDragging.value) {
    isDragging.value = false
  }

  // Swipe navigation when not zoomed
  if (zoom.value <= 1 && e.changedTouches.length === 1) {
    const t0 = e.changedTouches[0]
    if (!t0) return
    const deltaX = t0.clientX - touchStartX.value
    const deltaY = t0.clientY - touchStartY.value

    if (Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
      if (deltaX < 0) {
        imageViewer.next()
      } else {
        imageViewer.prev()
      }
    }
  }
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if (!imageViewer.isOpen) return

  if (e.key === 'Escape') {
    imageViewer.close()
  } else if (e.key === 'ArrowRight') {
    imageViewer.next()
  } else if (e.key === 'ArrowLeft') {
    imageViewer.prev()
  } else if (e.key === '+' || e.key === '=') {
    zoomIn()
  } else if (e.key === '-') {
    zoomOut()
  } else if (e.key === '0') {
    resetTransform()
  }
}

function openOriginal() {
  if (imageViewer.currentItem?.url) {
    window.open(imageViewer.currentItem.url, '_blank')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  document.body.style.overflow = ''
})

const hasMultiple = computed(() => imageViewer.items.length > 1)
const canPrev = computed(() => imageViewer.currentIndex > 0)
const canNext = computed(() => imageViewer.currentIndex < imageViewer.items.length - 1)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="imageViewer.isOpen && imageViewer.currentItem"
      class="image-zoom-overlay"
      @click.self="imageViewer.close"
    >
      <!-- Retro Top Header Bar -->
      <header class="viewer-header">
        <div class="header-left">
          <span class="header-prefix">»</span>
          <span class="header-title">
            {{ imageViewer.currentItem.title || 'Visualizar Imagem' }}
          </span>
          <span v-if="imageViewer.currentItem.subtitle" class="header-subtitle">
            ({{ imageViewer.currentItem.subtitle }})
          </span>
          <span v-if="hasMultiple" class="header-counter">
            [{{ imageViewer.currentIndex + 1 }} / {{ imageViewer.items.length }}]
          </span>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="header-btn close-btn"
            @click="imageViewer.close"
            title="Fechar (Esc)"
            aria-label="Fechar"
          >
            [ X ]
          </button>
        </div>
      </header>

      <!-- Main Viewer Stage -->
      <div
        class="viewer-stage"
        @wheel="handleWheel"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @click.self="imageViewer.close"
      >
        <!-- Floating Navigation Previous -->
        <button
          v-if="hasMultiple && canPrev"
          type="button"
          class="nav-arrow-btn nav-prev"
          @click="imageViewer.prev"
          title="Imagem anterior (←)"
          aria-label="Anterior"
        >
          ‹
        </button>

        <!-- The Image Canvas -->
        <div
          class="image-wrapper"
          :class="{
            'is-zoomed': zoom > 1,
            'is-dragging': isDragging,
          }"
          :style="{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.18s ease-out',
          }"
          @mousedown="handleMouseDown"
          @dblclick="toggleZoom"
        >
          <img
            :src="imageViewer.currentItem.url"
            :alt="imageViewer.currentItem.title || 'Imagem ampliada'"
            class="viewer-image"
            draggable="false"
          />
        </div>

        <!-- Floating Navigation Next -->
        <button
          v-if="hasMultiple && canNext"
          type="button"
          class="nav-arrow-btn nav-next"
          @click="imageViewer.next"
          title="Próxima imagem (→)"
          aria-label="Próxima"
        >
          ›
        </button>
      </div>

      <!-- Retro Bottom Controls Bar -->
      <footer class="viewer-toolbar">
        <div class="toolbar-group zoom-group">
          <button
            type="button"
            class="tool-btn"
            @click="zoomOut"
            :disabled="zoom <= MIN_ZOOM"
            title="Diminuir zoom (-)"
          >
            [ - ]
          </button>

          <span class="zoom-level-label" title="Nível de zoom">
            {{ Math.round(zoom * 100) }}%
          </span>

          <button
            type="button"
            class="tool-btn"
            @click="zoomIn"
            :disabled="zoom >= MAX_ZOOM"
            title="Aumentar zoom (+)"
          >
            [ + ]
          </button>

          <button
            type="button"
            class="tool-btn reset-btn"
            @click="resetTransform"
            title="Ajustar à tela / Resetar (0)"
          >
            [ 1:1 ]
          </button>
        </div>

        <div class="toolbar-group extras-group">
          <button
            type="button"
            class="tool-btn"
            @click="rotate"
            title="Girar 90°"
          >
            [ ↻ ]
          </button>

          <button
            type="button"
            class="tool-btn"
            @click="openOriginal"
            title="Abrir imagem original"
          >
            [ ↗ Original ]
          </button>
        </div>
      </footer>
    </div>
  </Teleport>
</template>

<style scoped>
.image-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background-color: rgba(14, 11, 9, 0.92);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  touch-action: none;
}

/* Header */
.viewer-header {
  flex-shrink: 0;
  height: 44px;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 2px solid var(--color-primary-900, #422d16);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-prefix {
  font-family: var(--font-heading, monospace);
  font-weight: bold;
}

.header-title {
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-subtitle {
  font-size: 0.8rem;
  opacity: 0.85;
}

.header-counter {
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
  transition: background 0.15s ease;
}

.header-btn:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.close-btn {
  color: #ffd8a8;
}

/* Stage */
.viewer-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.image-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 90vw;
  max-height: calc(100vh - 110px);
  cursor: zoom-in;
  transform-origin: center center;
  will-change: transform;
}

.image-wrapper.is-zoomed {
  cursor: grab;
}

.image-wrapper.is-dragging {
  cursor: grabbing;
}

.viewer-image {
  max-width: 90vw;
  max-height: calc(100vh - 120px);
  object-fit: contain;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background-color: #000000;
  border-radius: 2px;
  pointer-events: none;
}

/* Navigation Arrows */
.nav-arrow-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  border: 2px solid var(--color-primary, #a66130);
  font-size: 2.2rem;
  line-height: 1;
  width: 46px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 2px;
  z-index: 5;
  transition: all 0.15s ease;
}

.nav-arrow-btn:hover {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  transform: translateY(-50%) scale(1.05);
}

.nav-prev {
  left: 1rem;
}

.nav-next {
  right: 1rem;
}

/* Toolbar */
.viewer-toolbar {
  flex-shrink: 0;
  height: 48px;
  background-color: rgba(22, 17, 14, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0 1rem;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.tool-btn {
  background-color: #2b221a;
  border: 1px solid var(--color-primary-600, #9a6a32);
  color: #f8f6f1;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-btn:hover:not(:disabled) {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
}

.tool-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-level-label {
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  color: #e8c9a5;
  min-width: 48px;
  text-align: center;
  font-weight: bold;
}

@media (max-width: 600px) {
  .nav-arrow-btn {
    width: 38px;
    height: 48px;
    font-size: 1.8rem;
  }
  .nav-prev {
    left: 0.3rem;
  }
  .nav-next {
    right: 0.3rem;
  }
  .viewer-toolbar {
    height: auto;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0.5rem 0.75rem;
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }
  .zoom-group {
    width: 100%;
    justify-content: center;
  }
  .extras-group {
    display: flex;
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }
  .image-wrapper {
    max-height: calc(100vh - 145px);
    max-height: calc(100dvh - 145px);
  }
  .viewer-image {
    max-height: calc(100vh - 155px);
    max-height: calc(100dvh - 155px);
  }
}
</style>
