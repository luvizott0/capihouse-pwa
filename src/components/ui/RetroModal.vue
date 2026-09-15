<script setup lang="ts">
import RetroCard from './RetroCard.vue'

defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>
<template>
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
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 0.5rem;
  }
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 1.5rem);
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
  padding: 0 0.25rem;
}

.modal-close-btn:hover {
  opacity: 0.8;
}

:deep(.retro-card) {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  width: 100%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

:deep(.retro-card-header) {
  flex-shrink: 0;
}

:deep(.retro-card-body) {
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary-300, #d9a066) transparent;
}

:deep(.retro-card-footer) {
  flex-shrink: 0;
}
</style>
