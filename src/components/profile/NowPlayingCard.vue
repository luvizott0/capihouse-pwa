<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { User, SpotifyNowPlaying } from '@/types/models'
import { getUserSpotifyStatus } from '@/api/spotify'
import { formatRelativeTime } from '@/utils/date'

const props = defineProps<{
  user: User
}>()

const emit = defineEmits<{
  (e: 'repost', track: SpotifyNowPlaying): void
}>()

const nowPlaying = ref<SpotifyNowPlaying | null>(null)
const localProgressMs = ref(0)

let pollTimer: ReturnType<typeof setInterval> | null = null
let tickerTimer: ReturnType<typeof setInterval> | null = null

// Formata milissegundos para MM:SS
function formatTime(ms?: number | null): string {
  if (!ms || ms < 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const progressPercentage = computed(() => {
  if (!nowPlaying.value?.duration_ms || nowPlaying.value.duration_ms <= 0) return 0
  const pct = (localProgressMs.value / nowPlaying.value.duration_ms) * 100
  return Math.min(100, Math.max(0, pct))
})

const isPlaying = computed(() => {
  return !!nowPlaying.value?.is_playing && !!nowPlaying.value?.title
})

const hasMusicService = computed(() => {
  return !!props.user?.has_spotify_connected || !!props.user?.has_lastfm_connected
})

const isLastFm = computed(() => {
  return nowPlaying.value?.source === 'lastfm' || (!props.user?.has_spotify_connected && !!props.user?.has_lastfm_connected)
})

const headerTitle = computed(() => {
  return isPlaying.value ? '» Ouvindo Agora no Spotify' : '» Última Tocada no Spotify'
})

const listenUrl = computed(() => {
  return nowPlaying.value?.spotify_url || nowPlaying.value?.url || null
})

const listenLabel = computed(() => {
  if (listenUrl.value?.includes('last.fm')) {
    return 'Ver no Last.fm ↗'
  }
  return 'Ouvir no Spotify ↗'
})

const shouldShowCard = computed(() => {
  return hasMusicService.value && !!nowPlaying.value?.title
})

async function fetchStatus() {
  if (!hasMusicService.value || !props.user.username) {
    nowPlaying.value = null
    return
  }

  try {
    const res = await getUserSpotifyStatus(props.user.username)
    nowPlaying.value = res.data
    if (res.data.progress_ms !== undefined) {
      localProgressMs.value = res.data.progress_ms
    }
  } catch {
    // Falha silenciosa para não quebrar a UI
    nowPlaying.value = null
  }
}

// Incremento de tempo a cada segundo para barra de progresso suave em tempo real
function startTicker() {
  stopTicker()
  tickerTimer = setInterval(() => {
    if (isPlaying.value && nowPlaying.value?.duration_ms) {
      if (localProgressMs.value < nowPlaying.value.duration_ms) {
        localProgressMs.value += 1000
      }
    }
  }, 1000)
}

function stopTicker() {
  if (tickerTimer) {
    clearInterval(tickerTimer)
    tickerTimer = null
  }
}

function startPolling() {
  stopPolling()
  // Primeira busca imediata
  fetchStatus()

  // Polling a cada 15 segundos
  pollTimer = setInterval(() => {
    if (!document.hidden) {
      fetchStatus()
    }
  }, 15000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibilityChange() {
  if (!document.hidden && hasMusicService.value) {
    fetchStatus()
  }
}

watch(
  () => [props.user.username, props.user.has_spotify_connected, props.user.has_lastfm_connected],
  ([newUsername]) => {
    if (hasMusicService.value && newUsername) {
      startPolling()
      startTicker()
    } else {
      stopPolling()
      stopTicker()
      nowPlaying.value = null
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  if (hasMusicService.value) {
    startPolling()
    startTicker()
  }
})

onUnmounted(() => {
  stopPolling()
  stopTicker()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div v-if="shouldShowCard && nowPlaying" class="now-playing-container">
    <div class="retro-box now-playing-box">
      <!-- Header do Card Retrô -->
      <div class="box-header spotify-header">
        <div class="header-left">
          <span class="spotify-badge-icon">
            <svg class="spotify-logo-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.306c-.218.358-.682.473-1.04.254-2.854-1.743-6.446-2.138-10.678-1.171-.409.093-.815-.162-.909-.57-.093-.408.162-.814.57-.908 4.637-1.06 8.608-.61 11.803 1.345.358.219.473.682.254 1.05zm1.472-3.276c-.274.446-.86.588-1.306.314-3.267-2.008-8.246-2.59-12.11-1.417-.499.152-1.03-.133-1.182-.633-.152-.5.133-1.03.633-1.182 4.417-1.34 9.914-.693 13.651 1.612.446.274.588.86.314 1.306zm.126-3.41C15.202 8.293 8.76 8.08 5.097 9.193c-.6.182-1.237-.16-1.419-.76-.182-.6.16-1.236.76-1.418 4.22-1.282 11.332-1.036 15.727 1.574.54.32.716 1.026.396 1.566-.32.54-1.026.716-1.566.396z"/>
            </svg>
          </span>
          <span class="header-title">
            {{ headerTitle }}
          </span>
        </div>

        <!-- Equalizador animado em CSS se tocando, ou badge de Pausado -->
        <div v-if="isPlaying" class="equalizer-bars" title="Reproduzindo agora">
          <span class="eq-bar bar-1"></span>
          <span class="eq-bar bar-2"></span>
          <span class="eq-bar bar-3"></span>
          <span class="eq-bar bar-4"></span>
        </div>
        <div v-else class="recent-status-pill">
          <span>[ Pausado ]</span>
        </div>
      </div>

      <!-- Corpo com Efeito de Vinil -->
      <div class="box-body now-playing-body">
        <div class="player-content-wrapper">
          <!-- Vinil & Capa do Álbum -->
          <div class="vinyl-sleeve-stage">
            <!-- Capa do Álbum -->
            <div class="album-cover-jacket">
              <img
                v-if="nowPlaying.album_art"
                :src="nowPlaying.album_art"
                :alt="nowPlaying.title"
                class="album-image"
                loading="lazy"
              />
              <div v-else class="album-placeholder">
                🎵
              </div>
            </div>

            <!-- Disco de Vinil (Gira apenas se estiver tocando) -->
            <div class="vinyl-record-disc" :class="{ 'is-spinning': isPlaying }">
              <div class="vinyl-groove-inner">
                <div class="vinyl-center-label">
                  <div class="center-hole"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadados da Música -->
          <div class="track-metadata">
            <div class="track-info">
              <h4 class="track-title" :title="nowPlaying.title">
                {{ nowPlaying.title }}
              </h4>
              <p class="track-artist" :title="nowPlaying.artist">
                {{ nowPlaying.artist }}
              </p>
              <p v-if="nowPlaying.album" class="track-album" :title="nowPlaying.album">
                Álbum: <span>{{ nowPlaying.album }}</span>
              </p>
            </div>

            <!-- Barra de Progresso em Tempo Real (se tocando e tem duração) -->
            <div v-if="isPlaying && nowPlaying.duration_ms" class="progress-section">
              <div class="progress-track-bar">
                <div
                  class="progress-fill-bar"
                  :style="{ width: `${progressPercentage}%` }"
                ></div>
              </div>
              <div class="time-labels">
                <span>{{ formatTime(localProgressMs) }}</span>
                <span>{{ formatTime(nowPlaying.duration_ms) }}</span>
              </div>
            </div>

            <!-- Info de última reprodução (se pausado/recente) -->
            <div v-else-if="!isPlaying" class="recent-time-info">
              <span v-if="nowPlaying.duration_ms" class="track-duration-tag">⏱️ {{ formatTime(nowPlaying.duration_ms) }}</span>
              <span v-if="nowPlaying.played_at" class="track-played-at">
                • Ouvida {{ formatRelativeTime(nowPlaying.played_at) }}
              </span>
            </div>

            <!-- Ações: Link Spotify / Last.fm + Repostar no feed -->
            <div class="track-actions">
              <a
                v-if="listenUrl"
                :href="listenUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="spotify-listen-btn"
              >
                <span>{{ listenLabel }}</span>
              </a>
              <button
                type="button"
                class="spotify-repost-btn"
                title="Compartilhar esta música no feed"
                @click="emit('repost', nowPlaying)"
              >
                <span>🔁 Repostar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.now-playing-container {
  margin-bottom: 1.25rem;
}

.now-playing-box {
  border: 2px solid var(--color-border, #D8CDC5);
  background: var(--bg-card, #ffffff);
  border-radius: 2px;
  overflow: hidden;
}

.spotify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(90deg, #121212 0%, #1db954 100%);
  color: #ffffff;
  padding: 0.4rem 0.75rem;
  font-weight: 600;
  font-size: 0.82rem;
  letter-spacing: 0.03em;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.spotify-badge-icon {
  display: inline-flex;
  align-items: center;
  color: #1ed760;
}

/* Equalizador animado em CSS */
.equalizer-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 14px;
}

.eq-bar {
  width: 3px;
  background-color: #ffffff;
  border-radius: 1px;
  animation: eqPulse 1.2s ease-in-out infinite alternate;
}

.bar-1 { height: 40%; animation-delay: 0.1s; }
.bar-2 { height: 85%; animation-delay: 0.3s; }
.bar-3 { height: 60%; animation-delay: 0s; }
.bar-4 { height: 100%; animation-delay: 0.4s; }

@keyframes eqPulse {
  0% { height: 20%; opacity: 0.6; }
  100% { height: 100%; opacity: 1; }
}

.now-playing-body {
  padding: 0.85rem 1rem;
}

.player-content-wrapper {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

/* Palco do Vinil e Luva de Disco */
.vinyl-sleeve-stage {
  position: relative;
  width: 90px;
  height: 75px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* Capa do Álbum (Jacket) */
.album-cover-jacket {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.2);
  z-index: 2;
  background-color: #1e1e1e;
  flex-shrink: 0;
}

.album-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.album-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  background: #2a2a2a;
}

/* Disco de Vinil Preto */
.vinyl-record-disc {
  position: absolute;
  top: 4px;
  left: 24px;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2a2a 20%, #111111 22%, #111111 50%, #202020 52%, #111111 75%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: transform 0.3s ease;
}

.vinyl-groove-inner {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-center-label {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1db954;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #000000;
}

.center-hole {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
}

/* Rotação Contínua do Vinil */
.vinyl-record-disc.is-spinning {
  animation: spinVinyl 5s linear infinite;
}

@keyframes spinVinyl {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Metadados e Informações */
.track-metadata {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.track-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main, #222);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-primary-600, #1db954);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted, #777);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album span {
  font-style: italic;
}

/* Barra de Progresso */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-top: 0.2rem;
}

.progress-track-bar {
  width: 100%;
  height: 5px;
  background-color: var(--color-border, #e5e7eb);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill-bar {
  height: 100%;
  background-color: #1db954;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--text-muted, #888);
  font-family: var(--font-heading, monospace);
}

.recent-status-pill {
  font-size: 0.68rem;
  font-family: var(--font-heading, monospace);
  color: #a3e635;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.recent-time-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: var(--text-muted, #777);
  font-family: var(--font-heading, monospace);
  margin-top: 0.2rem;
}

.track-duration-tag {
  color: var(--text-main, #333);
  font-weight: 500;
}

.track-played-at {
  font-style: italic;
}

.track-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.25rem;
  flex-wrap: nowrap;
}

.spotify-listen-btn {
  font-size: 0.72rem;
  color: #15803d;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;
}

.spotify-listen-btn:hover {
  color: #16a34a;
  text-decoration: underline;
}

.spotify-repost-btn {
  background: none;
  border: 1px dashed #1db954;
  color: #15803d;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
  font-family: var(--font-heading, monospace);
}

.spotify-repost-btn:hover {
  background-color: rgba(29, 185, 84, 0.12);
  border-style: solid;
}

@media (max-width: 640px) {
  .player-content-wrapper {
    gap: 0.75rem;
  }
  .vinyl-sleeve-stage {
    width: 78px;
    height: 65px;
  }
  .album-cover-jacket {
    width: 58px;
    height: 58px;
  }
  .vinyl-record-disc {
    width: 56px;
    height: 56px;
    left: 20px;
  }
  .vinyl-groove-inner {
    width: 48px;
    height: 48px;
  }
}
</style>
