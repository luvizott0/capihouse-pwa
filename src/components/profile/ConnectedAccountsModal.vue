<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { User } from '@/types/models'
import { connectLetterboxd, disconnectLetterboxd, syncLetterboxd } from '@/api/letterboxd'
import { connectXbox, disconnectXbox, syncXbox } from '@/api/xbox'
import { getSpotifyAuthUrl, disconnectSpotify } from '@/api/spotify'
import { connectLastfm, disconnectLastfm } from '@/api/lastfm'
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

// Spotify State
const isConnectingSpotify = ref(false)
const isDisconnectingSpotify = ref(false)
const spotifyMessage = ref('')
const spotifyError = ref('')

// Last.fm State
const lastfmInput = ref('')
const isConnectingLastfm = ref(false)
const isDisconnectingLastfm = ref(false)
const lastfmMessage = ref('')
const lastfmError = ref('')

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
    spotifyMessage.value = ''
    spotifyError.value = ''
    lastfmInput.value = ''
    lastfmMessage.value = ''
    lastfmError.value = ''
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

// Spotify Handlers
async function handleConnectSpotify() {
  isConnectingSpotify.value = true
  spotifyError.value = ''
  spotifyMessage.value = ''
  try {
    const res = await getSpotifyAuthUrl()
    if (res.data.url) {
      window.location.href = res.data.url
    }
  } catch (err: any) {
    spotifyError.value = err.response?.data?.message || 'Erro ao conectar conta do Spotify.'
    isConnectingSpotify.value = false
  }
}

async function handleDisconnectSpotify() {
  isDisconnectingSpotify.value = true
  spotifyError.value = ''
  spotifyMessage.value = ''
  try {
    const res = await disconnectSpotify()
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    spotifyMessage.value = res.data.message
  } catch (err: any) {
    spotifyError.value = err.response?.data?.message || 'Erro ao desconectar conta do Spotify.'
  } finally {
    isDisconnectingSpotify.value = false
  }
}

// Last.fm Handlers
async function handleConnectLastfm() {
  if (!lastfmInput.value.trim()) return
  isConnectingLastfm.value = true
  lastfmError.value = ''
  lastfmMessage.value = ''
  try {
    const res = await connectLastfm(lastfmInput.value.trim())
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    lastfmMessage.value = res.data.message
    lastfmInput.value = ''
  } catch (err: any) {
    lastfmError.value = err.response?.data?.message || 'Erro ao conectar conta do Last.fm.'
  } finally {
    isConnectingLastfm.value = false
  }
}

async function handleDisconnectLastfm() {
  isDisconnectingLastfm.value = true
  lastfmError.value = ''
  lastfmMessage.value = ''
  try {
    const res = await disconnectLastfm()
    emit('userUpdated', res.data.user)
    if (authStore.user) {
      authStore.user = res.data.user
    }
    lastfmMessage.value = res.data.message
  } catch (err: any) {
    lastfmError.value = err.response?.data?.message || 'Erro ao desconectar conta do Last.fm.'
  } finally {
    isDisconnectingLastfm.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="retro-modal-overlay" @click.self="closeModal">
    <div class="retro-modal connected-accounts-modal">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">🔗</span>
          <span class="modal-title">» Contas Conectadas</span>
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
        </div>

        <!-- ======================= SPOTIFY (OCULTO TEMPORARIAMENTE) ======================= -->
        <!-- Ocultado no app por enquanto, utilizando Last.fm para scrobble sem limites -->
        <div v-if="false" class="account-card spotify-theme">
          <div class="account-card-header">
            <div class="brand-row">
              <span class="brand-badge-icon spotify-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#1DB954">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.306c-.218.358-.682.473-1.04.254-2.854-1.743-6.446-2.138-10.678-1.171-.409.093-.815-.162-.909-.57-.093-.408.162-.814.57-.908 4.637-1.06 8.608-.61 11.803 1.345.358.219.473.682.254 1.05zm1.472-3.276c-.274.446-.86.588-1.306.314-3.267-2.008-8.246-2.59-12.11-1.417-.499.152-1.03-.133-1.182-.633-.152-.5.133-1.03.633-1.182 4.417-1.34 9.914-.693 13.651 1.612.446.274.588.86.314 1.306zm.126-3.41C15.202 8.293 8.76 8.08 5.097 9.193c-.6.182-1.237-.16-1.419-.76-.182-.6.16-1.236.76-1.418 4.22-1.282 11.332-1.036 15.727 1.574.54.32.716 1.026.396 1.566-.32.54-1.026.716-1.566.396z"/>
                </svg>
              </span>
              <div class="brand-info">
                <div class="brand-name-status">
                  <h4 class="brand-name">Spotify</h4>
                  <span v-if="user.has_spotify_connected" class="status-badge connected spotify-connected">
                    ● Conectado
                  </span>
                  <span v-else class="status-badge disconnected">
                    ○ Não vinculado
                  </span>
                </div>
                <div v-if="user.has_spotify_connected" class="account-username">
                  Conta: <strong>{{ user.spotify_display_name || 'Spotify Conectado' }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Banners de feedback -->
          <div v-if="spotifyMessage" class="feedback-banner success">
            {{ spotifyMessage }}
          </div>
          <div v-if="spotifyError" class="feedback-banner error">
            {{ spotifyError }}
          </div>

          <!-- Ação quando não conectado -->
          <div v-if="!user.has_spotify_connected" class="connect-action-area">
            <div class="spotify-connect-action">
              <button
                type="button"
                class="retro-action-btn spotify-action-btn"
                :disabled="isConnectingSpotify"
                @click="handleConnectSpotify"
              >
                {{ isConnectingSpotify ? 'Abrindo Spotify...' : '🎵 Conectar Conta do Spotify' }}
              </button>
            </div>
            <p class="account-hint">
              Conecte sua conta para exibir a música que você está ouvindo em tempo real no seu perfil e na listagem de usuários online.
            </p>
          </div>

          <!-- Ações quando conectado -->
          <div v-else class="connected-action-area">
            <div class="buttons-row">
              <button
                type="button"
                class="retro-action-btn danger"
                :disabled="isDisconnectingSpotify"
                @click="handleDisconnectSpotify"
              >
                {{ isDisconnectingSpotify ? 'Desconectando...' : 'Desconectar Spotify' }}
              </button>
            </div>
            <p class="account-hint">
              Sua música atual aparecerá automaticamente para os outros membros da casa enquanto você estiver ouvindo.
            </p>
          </div>
        </div>

        <!-- ======================= LAST.FM ======================= -->
        <div class="account-card lastfm-theme">
          <div class="account-card-header">
            <div class="brand-row">
              <span class="brand-badge-icon lastfm-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#D51007">
                  <path d="M12.001 0C5.372 0 0 5.372 0 12c0 6.627 5.372 12 12.001 12 6.627 0 11.999-5.373 11.999-12 0-6.628-5.372-12-11.999-12zm2.146 15.688c-1.077 0-1.748-.567-2.34-1.57-.497-.84-1.259-2.614-2.147-2.614-.803 0-1.16.54-1.16 1.458 0 1.258.647 1.838 1.542 1.838.742 0 1.348-.37 1.764-.98l1.32.84c-.66 1.054-1.734 1.63-3.134 1.63-2.11 0-3.32-1.353-3.32-3.344 0-1.92 1.25-3.313 3.12-3.313 1.558 0 2.502.943 3.23 2.298.634 1.185 1.05 1.564 1.644 1.564.558 0 .97-.37.97-.99 0-.756-.474-1.31-1.393-1.684l.58-1.517c1.472.56 2.378 1.57 2.378 2.983 0 1.76-1.155 2.895-2.484 2.895z"/>
                </svg>
              </span>
              <div class="brand-info">
                <div class="brand-name-status">
                  <h4 class="brand-name">Last.fm</h4>
                  <span v-if="user.has_lastfm_connected" class="status-badge connected lastfm-connected">
                    ● Conectado
                  </span>
                  <span v-else class="status-badge disconnected">
                    ○ Não vinculado
                  </span>
                </div>
                <div v-if="user.has_lastfm_connected" class="account-username">
                  Usuário: <strong>@{{ user.lastfm_username }}</strong>
                  <a
                    :href="`https://www.last.fm/user/${user.lastfm_username}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="account-link"
                  >
                    Ver perfil ↗
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Banners de feedback -->
          <div v-if="lastfmMessage" class="feedback-banner success">
            {{ lastfmMessage }}
          </div>
          <div v-if="lastfmError" class="feedback-banner error">
            {{ lastfmError }}
          </div>

          <!-- Ação quando não conectado -->
          <div v-if="!user.has_lastfm_connected" class="connect-action-area">
            <form class="connect-form" @submit.prevent="handleConnectLastfm">
              <div class="form-row">
                <input
                  v-model="lastfmInput"
                  type="text"
                  class="retro-input"
                  placeholder="Nome de usuário do Last.fm"
                  autocomplete="off"
                  :disabled="isConnectingLastfm"
                />
                <button
                  type="submit"
                  class="retro-action-btn lastfm-action-btn"
                  :disabled="isConnectingLastfm || !lastfmInput.trim()"
                >
                  {{ isConnectingLastfm ? 'Conectando...' : 'Conectar' }}
                </button>
              </div>
              <p class="account-hint">
                Ideal para sincronizar o que você escuta no <strong>Spotify</strong>, <strong>Deezer</strong>, <strong>Apple Music</strong> ou <strong>YouTube Music</strong> sem limitação de vagas de desenvolvedor!
              </p>
            </form>
          </div>

          <!-- Ações quando conectado -->
          <div v-else class="connected-action-area">
            <div class="buttons-row">
              <button
                type="button"
                class="retro-action-btn danger"
                :disabled="isDisconnectingLastfm"
                @click="handleDisconnectLastfm"
              >
                {{ isDisconnectingLastfm ? 'Desconectando...' : 'Desconectar Last.fm' }}
              </button>
            </div>
            <p class="account-hint">
              Suas reproduções atuais e recentes do Last.fm aparecerão automaticamente no card musical do seu perfil.
            </p>
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
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: var(--color-primary, #a66130);
  color: #fff;
  border-bottom: 2px solid var(--color-primary-800, #5f4120);
  flex-wrap: nowrap;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-weight: bold;
  min-width: 0;
  flex: 1 1 auto;
}

.modal-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.modal-title {
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-close-bracket {
  flex-shrink: 0;
  white-space: nowrap;
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

/* Spotify Card Styles */
.account-card.spotify-theme {
  border-left: 4px solid #1db954;
}

.spotify-connected {
  color: #15803d !important;
  background-color: #dcfce7 !important;
}

.spotify-connect-action {
  display: flex;
}

.spotify-action-btn {
  background-color: #1db954;
  color: #ffffff;
  border-color: #16a34a;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.spotify-action-btn:hover:not(:disabled) {
  background-color: #1aa34a;
}

/* Last.fm Card Styles */
.account-card.lastfm-theme {
  border-left: 4px solid #d51007;
}

.lastfm-connected {
  color: #991b1b !important;
  background-color: #fee2e2 !important;
}

.lastfm-action-btn {
  background-color: #d51007;
  color: #ffffff;
  border-color: #b91c1c;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.lastfm-action-btn:hover:not(:disabled) {
  background-color: #b91c1c;
}
</style>
