<script setup lang="ts">
import { computed } from 'vue'
import RetroModal from './RetroModal.vue'
import RetroButton from './RetroButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    message: string
    details?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary'
    loading?: boolean
    alertOnly?: boolean
  }>(),
  {
    title: '» Confirmação',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'danger',
    loading: false,
    alertOnly: false,
  }
)

const cleanConfirmText = computed(() => {
  return (props.confirmText || 'Confirmar').replace(/^\[\s*|\s*\]$/g, '').trim()
})

const cleanCancelText = computed(() => {
  return (props.cancelText || 'Cancelar').replace(/^\[\s*|\s*\]$/g, '').trim()
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function handleClose() {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <RetroModal
    :modelValue="modelValue"
    @update:modelValue="handleClose"
    :title="title"
    size="sm"
  >
    <div class="confirm-dialog-content">
      <div class="confirm-body-row">
        <div class="confirm-icon-box" :class="`icon-${variant}`">
          <span v-if="variant === 'danger'">🗑️</span>
          <span v-else-if="variant === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <div class="confirm-text-col">
          <p class="confirm-primary-message">{{ message }}</p>
          <p v-if="details" class="confirm-details-text">{{ details }}</p>
        </div>
      </div>

      <div class="confirm-actions-row">
        <RetroButton
          v-if="!alertOnly"
          variant="secondary"
          size="sm"
          @click="handleClose"
          :disabled="loading"
        >
          {{ cleanCancelText }}
        </RetroButton>

        <RetroButton
          :variant="variant === 'danger' ? 'danger' : 'primary'"
          size="sm"
          :loading="loading"
          @click="handleConfirm"
        >
          {{ cleanConfirmText }}
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.confirm-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.25rem 0;
}

.confirm-body-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.confirm-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
}

.icon-danger {
  background-color: #fee2e2;
  border-color: #fca5a5;
}

.icon-warning {
  background-color: #fef3c7;
  border-color: #fcd34d;
}

.icon-primary {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary-300, #d4a574);
}

.confirm-text-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.confirm-primary-message {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  line-height: 1.4;
  margin: 0;
}

.confirm-details-text {
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.85rem;
  color: var(--color-muted, #847062);
  line-height: 1.4;
  margin: 0;
}

.confirm-actions-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}
</style>
