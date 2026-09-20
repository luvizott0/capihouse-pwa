<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import RetroCard from './RetroCard.vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

watch(
  () => props.modelValue,
  (isOpen) => {
    if (typeof document === 'undefined') return
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      const openModals = document.querySelectorAll('.modal-overlay')
      if (openModals.length <= 1) {
        document.body.style.overflow = ''
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined' && props.modelValue) {
    const openModals = document.querySelectorAll('.modal-overlay')
    if (openModals.length <= 1) {
      document.body.style.overflow = ''
    }
  }
})
</script>
<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="modal-content" :class="`modal-${size || 'md'}`">
        <RetroCard :title="title">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>{{ title }}</span>
              <button
                @click="$emit('update:modelValue', false)"
                class="modal-close-btn"
                type="button"
                aria-label="Fechar"
              >
                [X]
              </button>
            </div>
          </template>
          <slot />
          <template v-if="$slots.footer" #footer>
            <slot name="footer" />
          </template>
        </RetroCard>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0.5rem;
    align-items: flex-start;
  }
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 1.5rem);
  max-height: calc(100dvh - 1.5rem);
  display: flex;
  flex-direction: column;
  margin: auto;
  min-width: 0;
  box-sizing: border-box;
}

.modal-sm { max-width: 360px; }
.modal-lg { max-width: 800px; }
.modal-xl { max-width: 980px; }

.modal-close-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  min-width: 32px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}

.modal-close-btn:hover {
  opacity: 0.8;
}

:deep(.retro-card) {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  max-height: calc(100dvh - 2rem);
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
}

:deep(.retro-card-header) {
  flex-shrink: 0;
}

:deep(.retro-card-body) {
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary-300, #d9a066) transparent;
}

:deep(.retro-card-footer) {
  flex-shrink: 0;
}
</style>
