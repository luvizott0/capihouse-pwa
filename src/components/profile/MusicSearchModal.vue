<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SpotifyTrack } from '@/types/models'
import { searchSpotifyTracks } from '@/api/spotify'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'selectTrack', track: SpotifyTrack): void
}>()

const searchQuery = ref('')
const searchResults = ref<SpotifyTrack[]>([])
const isSearching = ref(false)
const errorMessage = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function closeModal() {
  emit('update:modelValue', false)
}

function handleSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  errorMessage.value = ''

  const q = searchQuery.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    isSearching.value = false
    return
  }

  isSearching.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const res = await searchSpotifyTracks(q)
      searchResults.value = res.data.tracks || []
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      errorMessage.value = msg || 'Erro ao buscar faixas no Spotify.'
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 350)
}

function selectTrack(track: SpotifyTrack) {
  emit('selectTrack', track)
  closeModal()
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    searchResults.value = []
    errorMessage.value = ''
  } else {
    if (debounceTimer) clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
    <div class="retro-box modal-box" role="dialog" aria-modal="true">
      <div class="box-header modal-header">
        <span class="modal-title">🎵 Escolher Minha Música do Perfil</span>
        <button type="button" class="btn-close" @click="closeModal" aria-label="Fechar">✕</button>
      </div>

      <div class="box-body modal-body">
        <p class="modal-hint">
          Pesquise uma música no Spotify para destacá-la no seu card de Sobre Mim.
        </p>

        <!-- Campo de Busca -->
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            class="retro-input music-input"
            placeholder="Digite o nome da música ou artista..."
            autofocus
            @input="handleSearchInput"
          />
          <span v-if="isSearching" class="spin-indicator">⏳</span>
        </div>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Lista de Resultados -->
        <div class="results-container">
          <div v-if="isSearching && searchResults.length === 0" class="state-message">
            Buscando músicas no Spotify...
          </div>

          <div v-else-if="searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0" class="state-message">
            Nenhuma música encontrada para "{{ searchQuery }}".
          </div>

          <div v-else-if="searchQuery.trim().length < 2" class="empty-state-message">
            Digite pelo menos 2 caracteres para começar a buscar.
          </div>

          <div v-else class="tracks-list">
            <button
              v-for="track in searchResults"
              :key="track.id || track.title"
              type="button"
              class="track-item"
              @click="selectTrack(track)"
            >
              <img
                v-if="track.album_art"
                :src="track.album_art"
                :alt="track.title"
                class="track-art"
                loading="lazy"
              />
              <div v-else class="track-art-placeholder">🎵</div>

              <div class="track-text">
                <span class="track-title-item">{{ track.title }}</span>
                <span class="track-artist-item">{{ track.artist }}</span>
                <span v-if="track.album" class="track-album-item">{{ track.album }}</span>
              </div>

              <span class="choose-badge">Fixar</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="retro-action-btn cancel-btn" @click="closeModal">
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-box {
  width: 100%;
  max-width: 480px;
  background: var(--bg-card, #ffffff);
  border: 2px solid var(--color-border, #4a3728);
  box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-primary-600, #385d38);
  color: #ffffff;
  padding: 0.5rem 0.75rem;
}

.modal-title {
  font-weight: 600;
  font-size: 0.88rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-hint {
  font-size: 0.8rem;
  color: var(--text-muted, #666);
  margin: 0;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  font-size: 0.85rem;
  pointer-events: none;
}

.music-input {
  width: 100%;
  padding-left: 2.1rem;
  padding-right: 2rem;
  font-size: 0.85rem;
}

.spin-indicator {
  position: absolute;
  right: 0.65rem;
  font-size: 0.85rem;
}

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  border: 1px solid #f87171;
}

.results-container {
  min-height: 180px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  background: var(--bg-surface, #f9fafb);
}

.state-message,
.empty-state-message {
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-muted, #777);
}

.tracks-list {
  display: flex;
  flex-direction: column;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border, #eee);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.15s;
}

.track-item:last-child {
  border-bottom: none;
}

.track-item:hover {
  background: rgba(29, 185, 84, 0.08);
}

.track-art {
  width: 44px;
  height: 44px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.track-art-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 3px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.track-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.track-title-item {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main, #111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist-item {
  font-size: 0.75rem;
  color: var(--color-primary-600, #1db954);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album-item {
  font-size: 0.7rem;
  color: var(--text-muted, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.choose-badge {
  font-size: 0.7rem;
  font-weight: 600;
  background: #1db954;
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  flex-shrink: 0;
}

.modal-footer {
  padding: 0.5rem 0.75rem;
  background: var(--bg-card, #f8f8f8);
  border-top: 1px solid var(--color-border, #eee);
  display: flex;
  justify-content: flex-end;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 3px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #d1d5db;
}
</style>
