<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { User } from '@/types/models'
import { connectLetterboxd, disconnectLetterboxd, syncLetterboxd } from '@/api/letterboxd'
import { connectXbox, disconnectXbox, syncXbox } from '@/api/xbox'
import { formatRelativeTime } from '@/utils/date'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  modelValue: boolean
  user: User
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'userUpdated', user: User): void
}>()

const authStore = useAuthStore()

// Letterboxd State
const letterboxdInput = ref('')
const isConnectingLetterboxd = ref(false)
const isSyncingLetterboxd = ref(false)
const isDisconnectingLetterboxd = ref(false)
const letterboxdMessage = ref('')
const letterboxdError = ref('')
let letterboxdPollTimer: ReturnType<typeof setInterval> | null = null

// Xbox State
const xboxInput = ref('')
const isConnectingXbox = ref(false)
const isSyncingXbox = ref(false)
const isDisconnectingXbox = ref(false)
const xboxMessage = ref('')
const xboxError = ref('')
let xboxPollTimer: ReturnType<typeof setInterval> | null = null

function clearTimers() {
  if (letterboxdPollTimer) {
    clearInterval(letterboxdPollTimer)
    letterboxdPollTimer = null
  }
  if (xboxPollTimer) {
    clearInterval(xboxPollTimer)
    xboxPollTimer = null
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    clearTimers()
    letterboxdMessage.value = ''
    letterboxdError.value = ''
    xboxMessage.value = ''
    xboxError.value = ''
  }
})

onUnmounted(() => {
  clearTimers()
})

function closeModal() {
  emit('update:modelValue', false)
}

// Letterboxd Handlers
function startLetterboxdPolling() {
  if (letterboxdPollTimer) clearInterval(letterboxdPollTimer)
  isSyncingLetterboxd.value = true

  let attempts = 0
  letterboxdPollTimer = setInterval(async () => {
    attempts++
    const updated = await authStore.fetchMe()
    const isSyncing = updated?.letterboxd_is_syncing ?? false

    if (!isSyncing || attempts >= 15) {
      clearInterval(letterboxdPollTimer!)
      letterboxdPollTimer = null
      isSyncingLetterboxd.value = false
      if (updated) emit('userUpdated', updated)
    }
  }, 2500)
}

async function handleConnectLetterboxd() {
  if (!letterboxdInput.value.trim()) return
  isConnectingLetterboxd.value = true
  letterboxdError.value = ''
  letterboxdMessage.value = ''

  try {
    const res = await connectLetterboxd(letterboxdInput.value.trim())
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    letterboxdMessage.value = res.data.message
    letterboxdInput.value = ''
    startLetterboxdPolling()
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao conectar conta do Letterboxd.'
  } finally {
    isConnectingLetterboxd.value = false
  }
}

async function handleDisconnectLetterboxd() {
  isDisconnectingLetterboxd.value = true
  letterboxdError.value = ''
  letterboxdMessage.value = ''

  try {
    const res = await disconnectLetterboxd()
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    letterboxdMessage.value = res.data.message
    isSyncingLetterboxd.value = false
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao desconectar Letterboxd.'
  } finally {
    isDisconnectingLetterboxd.value = false
  }
}

async function handleSyncLetterboxd() {
  letterboxdError.value = ''
  letterboxdMessage.value = ''

  try {
    const res = await syncLetterboxd()
    if (res.data.user) {
      emit('userUpdated', res.data.user)
      if (authStore.user) authStore.user = res.data.user
    }
    letterboxdMessage.value = res.data.message
    startLetterboxdPolling()
  } catch (err: any) {
    letterboxdError.value = err.response?.data?.message || 'Erro ao iniciar sincronização.'
    isSyncingLetterboxd.value = false
  }
}

// Xbox Handlers
function startXboxPolling() {
  if (xboxPollTimer) clearInterval(xboxPollTimer)
  isSyncingXbox.value = true

  let attempts = 0
  xboxPollTimer = setInterval(async () => {
    attempts++
    const updated = await authStore.fetchMe()
    const isSyncing = updated?.xbox_is_syncing ?? false

    if (!isSyncing || attempts >= 15) {
      clearInterval(xboxPollTimer!)
      xboxPollTimer = null
      isSyncingXbox.value = false
      if (updated) emit('userUpdated', updated)
    }
  }, 2500)
}

async function handleConnectXbox() {
  if (!xboxInput.value.trim()) return
  isConnectingXbox.value = true
  xboxError.value = ''
  xboxMessage.value = ''

  try {
    const res = await connectXbox(xboxInput.value.trim())
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    xboxMessage.value = res.data.message
    xboxInput.value = ''
    startXboxPolling()
  } catch (err: any) {
    xboxError.value = err.response?.data?.message || 'Erro ao conectar Gamertag do Xbox.'
  } finally {
    isConnectingXbox.value = false
  }
}

async function handleDisconnectXbox() {
  isDisconnectingXbox.value = true
  xboxError.value = ''
  xboxMessage.value = ''

  try {
    const res = await disconnectXbox()
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    xboxMessage.value = res.data.message
    isSyncingXbox.value = false
  } catch (err: any) {
    xboxError.value = err.response?.data?.message || 'Erro ao desconectar Xbox.'
  } finally {
    isDisconnectingXbox.value = false
  }
}

async function handleSyncXbox() {
  xboxError.value = ''
  xboxMessage.value = ''

  try {
    const res = await syncXbox()
    if (res.data.user) {
      emit('userUpdated', res.data.user)
      if (authStore.user) authStore.user = res.data.user
    }
    xboxMessage.value = res.data.message
    startXboxPolling()
  } catch (err: any) {
    xboxError.value = err.response?.data?.message || 'Erro ao iniciar sincronização do Xbox.'
    isSyncingXbox.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="retro-modal-overlay" @click.self="closeModal">
    <div class="retro-modal connected-accounts-modal">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">🔗</span>
          <span class="modal-title">» Contas Conectadas & Integrações</span>
        </div>
        <button type="button" class="btn-close-bracket" @click="closeModal" title="Fechar">
          [ x ]
        </button>
      </div>

      <div class="modal-body">
        <p class="section-lead-desc">
          Vincule suas plataformas externas para sincronizar seus filmes, jogos e conquistas automaticamente com a comunidade da casa.
        </p>

        <!-- ======================= LETTERBOXD ======================= -->
        <div class="account-card letterboxd-theme">
          <div class="account-card-header">
            <div class="brand-row">
              <span class="brand-badge-icon letterboxd-icon">🍿</span>
              <div class="brand-info">
                <div class="brand-name-status">
                  <h4 class="brand-name">Letterboxd</h4>
                  <span v-if="user.letterboxd_username" class="status-badge connected">
                    ● Conectado
                  </span>
                  <span v-else class="status-badge disconnected">
                    ○ Não vinculado
                  </span>
                </div>
                <div v-if="user.letterboxd_username" class="account-username">
                  @{{ user.letterboxd_username }}
                </div>
              </div>
            </div>

            <div v-if="user.letterboxd_last_synced_at" class="last-sync-time">
              Sincronizado {{ formatRelativeTime(user.letterboxd_last_synced_at) }}
            </div>
          </div>

          <!-- Banners de feedback -->
          <div v-if="letterboxdMessage" class="feedback-banner success">
            {{ letterboxdMessage }}
          </div>
          <div v-if="letterboxdError" class="feedback-banner error">
            {{ letterboxdError }}
          </div>

          <!-- Formulário de Conexão -->
          <div v-if="!user.letterboxd_username" class="connect-action-area">
            <div class="input-with-button">
              <div class="input-wrap">
                <span class="input-prefix">@</span>
                <input
                  v-model="letterboxdInput"
                  type="text"
                  class="retro-input"
                  placeholder="seu_usuario_letterboxd"
                  @keyup.enter="handleConnectLetterboxd"
                />
              </div>
              <button
                type="button"
                class="retro-action-btn primary"
                :disabled="isConnectingLetterboxd || !letterboxdInput.trim()"
                @click="handleConnectLetterboxd"
              >
                {{ isConnectingLetterboxd ? 'Conectando...' : 'Conectar' }}
              </button>
            </div>
            <p class="account-hint">
              Seu perfil deve ser público no Letterboxd para importarmos suas resenhas e filmes assistidos.
            </p>
          </div>

          <!-- Ações quando conectado -->
          <div v-else class="connected-action-area">
            <div class="buttons-row">
              <button
                type="button"
                class="retro-action-btn primary sync-btn"
                :disabled="isSyncingLetterboxd || user.letterboxd_is_syncing"
                @click="handleSyncLetterboxd"
              >
                <span v-if="isSyncingLetterboxd || user.letterboxd_is_syncing" class="spin-dot">🔄</span>
                <span>{{ (isSyncingLetterboxd || user.letterboxd_is_syncing) ? 'Sincronizando...' : '🔄 Sincronizar Agora' }}</span>
              </button>

              <button
                type="button"
                class="retro-action-btn danger"
                :disabled="isDisconnectingLetterboxd || isSyncingLetterboxd"
                @click="handleDisconnectLetterboxd"
              >
                {{ isDisconnectingLetterboxd ? 'Removendo...' : 'Remover Conta' }}
              </button>
            </div>
            <p class="account-hint">
              Suas resenhas de cinema aparecerão na aba 🎬 Filmes do feed de entretenimento.
            </p>
          </div>
        </div>

        <!-- ======================= XBOX LIVE ======================= -->
        <div class="account-card xbox-theme">
          <div class="account-card-header">
            <div class="brand-row">
              <span class="brand-badge-icon xbox-icon">🎮</span>
              <div class="brand-info">
                <div class="brand-name-status">
                  <h4 class="brand-name">Xbox Live</h4>
                  <span v-if="user.xbox_gamertag" class="status-badge connected xbox-connected">
                    ● Conectado
                  </span>
                  <span v-else class="status-badge disconnected">
                    ○ Não vinculado
                  </span>
                </div>
                <div v-if="user.xbox_gamertag" class="account-username">
                  Gamertag: <strong>{{ user.xbox_gamertag }}</strong>
                </div>
              </div>
            </div>

            <div v-if="user.xbox_last_synced_at" class="last-sync-time">
              Sincronizado {{ formatRelativeTime(user.xbox_last_synced_at) }}
            </div>
          </div>

          <!-- Banners de feedback -->
          <div v-if="xboxMessage" class="feedback-banner success">
            {{ xboxMessage }}
          </div>
          <div v-if="xboxError" class="feedback-banner error">
            {{ xboxError }}
          </div>

          <!-- Formulário de Conexão -->
          <div v-if="!user.xbox_gamertag" class="connect-action-area">
            <div class="input-with-button">
              <div class="input-wrap">
                <span class="input-prefix">🎮</span>
                <input
                  v-model="xboxInput"
                  type="text"
                  class="retro-input"
                  placeholder="Sua Gamertag (ex: MasterChief117)"
                  @keyup.enter="handleConnectXbox"
                />
              </div>
              <button
                type="button"
                class="retro-action-btn xbox-action-btn"
                :disabled="isConnectingXbox || !xboxInput.trim()"
                @click="handleConnectXbox"
              >
                {{ isConnectingXbox ? 'Conectando...' : 'Conectar' }}
              </button>
            </div>
            <p class="account-hint">
              Seu histórico de jogos e conquistas deve estar configurado como público na sua conta Microsoft / Xbox.
            </p>
          </div>

          <!-- Ações quando conectado -->
          <div v-else class="connected-action-area">
            <div class="buttons-row">
              <button
                type="button"
                class="retro-action-btn xbox-action-btn sync-btn"
                :disabled="isSyncingXbox || user.xbox_is_syncing"
                @click="handleSyncXbox"
              >
                <span v-if="isSyncingXbox || user.xbox_is_syncing" class="spin-dot">🔄</span>
                <span>{{ (isSyncingXbox || user.xbox_is_syncing) ? 'Sincronizando...' : '🔄 Sincronizar Agora' }}</span>
              </button>

              <button
                type="button"
                class="retro-action-btn danger"
                :disabled="isDisconnectingXbox || isSyncingXbox"
                @click="handleDisconnectXbox"
              >
                {{ isDisconnectingXbox ? 'Removendo...' : 'Remover Conta' }}
              </button>
            </div>
            <p class="account-hint">
              Jogos recentes e quando você <strong>miletar (100%)</strong> aparecerão automaticamente na aba 🎮 Jogos!
            </p>
          </div>

          <!-- Dica sobre a chave OPENXBL_API_KEY -->
          <div class="api-help-note">
            <span class="note-icon">💡</span>
            <div class="note-text">
              Para sincronizar jogos e conquistas automaticamente, adicione <code>OPENXBL_API_KEY</code> no arquivo <code>.env</code> do servidor. Obtenha sua chave gratuita em <a href="https://xbl.io" target="_blank" rel="noopener noreferrer" class="link-external">xbl.io ↗</a>.
            </div>
          </div>
        </div>

        <!-- ======================= FUTURAS INTEGRAÇÕES ======================= -->
        <div class="upcoming-accounts-box">
          <h5 class="upcoming-title">🚀 Mais integrações em breve</h5>
          <div class="upcoming-grid">
            <div class="upcoming-item">
              <span class="upcoming-item-icon">🕹️</span>
              <div class="upcoming-item-text">
                <strong>Steam</strong>
                <span class="soon-tag">Em breve</span>
              </div>
            </div>
            <div class="upcoming-item">
              <span class="upcoming-item-icon">⚡</span>
              <div class="upcoming-item-text">
                <strong>PlayStation Network</strong>
                <span class="soon-tag">Em breve</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="closeModal">
          [ Fechar ]
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.retro-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.connected-accounts-modal {
  width: 100%;
  max-width: 580px;
  background: var(--color-surface, #fff);
  border: 2px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.85rem;
  background: var(--color-primary, #a66130);
  color: #fff;
  border-bottom: 2px solid var(--color-primary-800, #5f4120);
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-weight: bold;
}

.modal-icon {
  font-size: 1.1rem;
}

.modal-title {
  font-size: 0.95rem;
  letter-spacing: 0.5px;
}

.btn-close-bracket {
  background: none;
  border: none;
  color: #fff;
  font-family: var(--font-mono, monospace);
  font-weight: bold;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 0.9rem;
}

.btn-close-bracket:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-lead-desc {
  font-size: 0.85rem;
  color: var(--color-text-muted, #6b7280);
  margin: 0;
  line-height: 1.4;
}

/* Account Card */
.account-card {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  padding: 0.9rem;
  background: var(--color-surface-soft, #f9fafb);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s;
}

.account-card.letterboxd-theme {
  border-left: 4px solid #00e054;
}

.account-card.xbox-theme {
  border-left: 4px solid #107c10;
}

.account-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.brand-badge-icon {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: #fff;
  border: 1px solid var(--color-border, #e5e7eb);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.brand-name-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text, #111827);
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
}

.status-badge.connected {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.status-badge.xbox-connected {
  background: #dcfce7;
  color: #0e5e0e;
  border: 1px solid #86efac;
}

.status-badge.disconnected {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.account-username {
  font-size: 0.8rem;
  color: var(--color-text, #374151);
  font-family: var(--font-mono, monospace);
  margin-top: 0.15rem;
}

.last-sync-time {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  font-family: var(--font-mono, monospace);
}

/* Feedback Banners */
.feedback-banner {
  padding: 0.5rem 0.75rem;
  border-radius: 3px;
  font-size: 0.82rem;
  font-weight: 500;
}

.feedback-banner.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.feedback-banner.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* API Help Note */
.api-help-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #166534;
  line-height: 1.4;
}

.note-icon {
  font-size: 0.95rem;
  line-height: 1;
}

.note-text code {
  background: #dcfce7;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  color: #14532d;
}

.link-external {
  color: #0e5e0e;
  font-weight: 600;
  text-decoration: underline;
}

.link-external:hover {
  color: #052e05;
}

/* Inputs & Actions */
.input-with-button {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input-wrap {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 0.6rem;
  color: var(--color-text-muted, #9ca3af);
  font-family: var(--font-mono, monospace);
  pointer-events: none;
}

.retro-input {
  width: 100%;
  padding: 0.45rem 0.6rem 0.45rem 1.8rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 3px;
  background: #fff;
  color: var(--color-text, #111827);
  font-size: 0.85rem;
  font-family: inherit;
}

.retro-input:focus {
  outline: none;
  border-color: var(--color-primary, #a66130);
  box-shadow: 0 0 0 1px var(--color-primary, #a66130);
}

.account-hint {
  margin: 0.4rem 0 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  line-height: 1.35;
}

.buttons-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.retro-action-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 3px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  font-family: inherit;
}

.retro-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retro-action-btn.primary {
  background: var(--color-primary, #a66130);
  color: #fff;
  border-color: var(--color-primary-800, #5f4120);
}

.retro-action-btn.primary:hover:not(:disabled) {
  opacity: 0.9;
}

.retro-action-btn.xbox-action-btn {
  background: #107c10;
  color: #fff;
  border-color: #0b570b;
}

.retro-action-btn.xbox-action-btn:hover:not(:disabled) {
  background: #0e6b0e;
}

.retro-action-btn.danger {
  background: #fff;
  color: #dc2626;
  border-color: #fca5a5;
}

.retro-action-btn.danger:hover:not(:disabled) {
  background: #fef2f2;
}

.spin-dot {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Upcoming section */
.upcoming-accounts-box {
  background: #f3f4f6;
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 0.75rem;
}

.upcoming-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: #4b5563;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.upcoming-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.upcoming-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 0.45rem 0.65rem;
  border-radius: 3px;
}

.upcoming-item-icon {
  font-size: 1.1rem;
}

.upcoming-item-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.soon-tag {
  font-size: 0.65rem;
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
}

.modal-footer {
  padding: 0.75rem 1rem;
  background: var(--color-surface-soft, #f9fafb);
  border-top: 1px solid var(--color-border, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.btn-cancel {
  background: none;
  border: none;
  color: var(--color-text-muted, #4b5563);
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
}

.btn-cancel:hover {
  color: var(--color-text, #111827);
  text-decoration: underline;
}
</style>
