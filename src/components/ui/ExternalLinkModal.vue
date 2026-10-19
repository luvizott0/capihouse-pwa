<script setup lang="ts">
import { useExternalLinkStore } from '@/stores/externalLink'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const externalLinkStore = useExternalLinkStore()
</script>

<template>
  <RetroModal
    :model-value="externalLinkStore.isOpen"
    title="» Link Externo"
    size="sm"
    @update:model-value="(val) => { if (!val) externalLinkStore.close() }"
  >
    <div class="external-link-dialog">
      <!-- Warning alert box -->
      <div class="warning-banner">
        <span class="warning-icon">⚠️</span>
        <div class="warning-body">
          <strong class="warning-title">Você está saindo do CapiHouse</strong>
          <p class="warning-text">
            Este link levará você para um endereço externo. Certifique-se de que confia no destino antes de prosseguir:
          </p>
        </div>
      </div>

      <!-- Target URL Box -->
      <div class="url-card">
        <div class="domain-header">
          <span class="domain-icon">🌐</span>
          <span class="domain-badge">{{ externalLinkStore.domain || 'Link Externo' }}</span>
        </div>
        <div class="url-text-box" :title="externalLinkStore.url">
          {{ externalLinkStore.url }}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions-row">
        <RetroButton
          type="button"
          variant="secondary"
          class="copy-btn"
          :class="{ 'copied-success': externalLinkStore.isCopied }"
          @click="externalLinkStore.copy()"
        >
          <span v-if="externalLinkStore.isCopied">✓ Link Copiado!</span>
          <span v-else>📋 Copiar Link</span>
        </RetroButton>

        <div class="actions-right">
          <RetroButton
            type="button"
            variant="secondary"
            @click="externalLinkStore.close()"
          >
            Cancelar
          </RetroButton>
          <RetroButton
            type="button"
            variant="primary"
            class="open-link-btn"
            @click="externalLinkStore.confirmOpen()"
          >
            Abrir Link ↗
          </RetroButton>
        </div>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.external-link-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background-color: #fffbeb;
  border: 1.5px solid #f59e0b;
  border-radius: 4px;
  padding: 0.75rem 0.85rem;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1);
}

.warning-icon {
  font-size: 1.35rem;
  line-height: 1;
  flex-shrink: 0;
}

.warning-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.warning-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.88rem;
  color: #92400e;
  font-weight: 700;
}

.warning-text {
  font-size: 0.8rem;
  color: #78350f;
  margin: 0;
  line-height: 1.4;
}

.url-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background-color: #ffffff;
  border: 1.5px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  padding: 0.75rem;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.domain-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.domain-icon {
  font-size: 0.95rem;
}

.domain-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-100, #f8efe6);
  padding: 0.15rem 0.5rem;
  border-radius: 2px;
  border: 1px solid var(--color-primary-200, #e8c9a5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-text-box {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 0.78rem;
  color: #1f2937;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.65rem;
  border-radius: 2px;
  word-break: break-all;
  max-height: 80px;
  overflow-y: auto;
  line-height: 1.35;
}

.modal-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border, #D8CDC5);
  padding-top: 0.85rem;
  flex-wrap: wrap;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.copy-btn.copied-success {
  background-color: #dcfce7 !important;
  color: #15803d !important;
  border-color: #86efac !important;
  font-weight: 700;
}

.open-link-btn {
  font-weight: 700;
}

@media (max-width: 480px) {
  .modal-actions-row {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .actions-right {
    display: flex;
    width: 100%;
    gap: 0.5rem;
  }

  .actions-right button {
    flex: 1;
  }

  .copy-btn {
    width: 100%;
  }
}
</style>
