<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Post } from '@/types/models'
import { createGameReview, searchGames, type GameSearchResult } from '@/api/games'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'created', post: Post): void
}>()

const gameTitle = ref('')
const searchQuery = ref('')
const searchResults = ref<GameSearchResult[]>([])
const selectedGame = ref<GameSearchResult | null>(null)
const isSearching = ref(false)
const showDropdown = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const platform = ref('Xbox Series X|S')
const gameStatus = ref<'playing' | 'completed' | 'mastered' | 'dropped' | 'wishlist'>('completed')
const rating = ref<number | null>(5)
const hoursPlayed = ref<number | null>(null)
const boxArtUrl = ref('')
const boxArtFile = ref<File | null>(null)
const content = ref('')

const isSubmitting = ref(false)
const errorMessage = ref('')

const availablePlatforms = [
  'Xbox Series X|S',
  'Xbox One',
  'PC (Windows / Steam)',
  'PlayStation 5',
  'PlayStation 4',
  'Nintendo Switch',
  'Retro / Emulador',
  'Outro',
]

function onSearchInput() {
  gameTitle.value = searchQuery.value
  if (selectedGame.value && selectedGame.value.title !== searchQuery.value) {
    selectedGame.value = null
    boxArtUrl.value = ''
  }

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  const q = searchQuery.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    showDropdown.value = false
    isSearching.value = false
    return
  }

  isSearching.value = true
  showDropdown.value = true

  searchTimeout = setTimeout(async () => {
    try {
      const res = await searchGames(q)
      searchResults.value = res.data.data || []
    } catch (err) {
      console.error('Erro ao buscar jogos:', err)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function onSearchFocus() {
  if (searchResults.value.length > 0 && !selectedGame.value) {
    showDropdown.value = true
  }
}

function onSearchBlur() {
  // Pequeno timeout para permitir o clique em item do dropdown
  setTimeout(() => {
    showDropdown.value = false
  }, 250)
}

function selectGame(game: GameSearchResult) {
  selectedGame.value = game
  gameTitle.value = game.title
  searchQuery.value = game.title
  boxArtUrl.value = game.cover_url || ''
  showDropdown.value = false
  searchResults.value = []
}

function clearSelectedGame() {
  selectedGame.value = null
  gameTitle.value = ''
  searchQuery.value = ''
  boxArtUrl.value = ''
  searchResults.value = []
  showDropdown.value = false
}

function setRating(val: number) {
  if (rating.value === val) {
    rating.value = null
  } else {
    rating.value = val
  }
}

function resetForm() {
  gameTitle.value = ''
  searchQuery.value = ''
  selectedGame.value = null
  searchResults.value = []
  showDropdown.value = false
  isSearching.value = false
  platform.value = 'Xbox Series X|S'
  gameStatus.value = 'completed'
  rating.value = 5
  hoursPlayed.value = null
  boxArtUrl.value = ''
  boxArtFile.value = null
  content.value = ''
  errorMessage.value = ''
}

watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    resetForm()
  }
})

function closeModal() {
  emit('update:modelValue', false)
}

async function handleSubmit() {
  if (!gameTitle.value.trim()) {
    errorMessage.value = 'Informe ou selecione o título do jogo.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const res = await createGameReview({
      game_title: gameTitle.value.trim(),
      platform: platform.value,
      game_status: gameStatus.value,
      rating: rating.value,
      hours_played: hoursPlayed.value,
      box_art_url: boxArtUrl.value.trim() || undefined,
      content: content.value.trim() || undefined,
    })

    emit('created', res.data.post)
    closeModal()
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Erro ao publicar análise de jogo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="retro-modal-overlay" @click.self="closeModal">
    <div class="retro-modal review-modal">
      <div class="modal-header">
        <div class="modal-title-row">
          <span class="modal-icon">🎮</span>
          <span class="modal-title">» Nova Análise de Jogo</span>
        </div>
        <button type="button" class="btn-close-bracket" @click="closeModal" title="Fechar">
          [ x ]
        </button>
      </div>

      <div class="modal-body">
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Título do Jogo (Search Select) -->
        <div class="form-group">
          <label class="form-label">Jogo *</label>

          <!-- Card de Jogo Selecionado -->
          <div v-if="selectedGame" class="selected-game-card">
            <img v-if="boxArtUrl" :src="boxArtUrl" :alt="gameTitle" class="selected-game-cover" />
            <div v-else class="selected-game-no-cover">🎮</div>
            <div class="selected-game-info">
              <span class="selected-game-label">Jogo Selecionado:</span>
              <span class="selected-game-title">{{ gameTitle }}</span>
              <span class="selected-game-badge">✓ Capa vinculada automaticamente</span>
            </div>
            <button type="button" class="btn-change-game" @click="clearSelectedGame">
              [ Alterar ]
            </button>
          </div>

          <!-- Input de Busca com Autocomplete -->
          <div v-else class="game-search-select-wrapper">
            <div class="search-input-box">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchQuery"
                type="text"
                class="retro-input search-game-input"
                placeholder="Busque o jogo (ex: Lego Marvel, The Witcher, Halo, Elden Ring)..."
                maxlength="200"
                @input="onSearchInput"
                @focus="onSearchFocus"
                @blur="onSearchBlur"
              />
              <span v-if="isSearching" class="search-spinner" title="Buscando...">⏳</span>
              <button
                v-else-if="searchQuery"
                type="button"
                class="btn-clear-search"
                @click="clearSelectedGame"
                title="Limpar busca"
              >
                ×
              </button>
            </div>

            <!-- Dropdown de Resultados da API -->
            <div v-if="showDropdown && (searchResults.length > 0 || isSearching)" class="search-results-dropdown">
              <div v-if="isSearching && searchResults.length === 0" class="dropdown-status">
                Buscando no catálogo...
              </div>
              <div
                v-for="item in searchResults"
                :key="item.id"
                class="dropdown-item"
                @mousedown="selectGame(item)"
              >
                <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" class="dropdown-item-cover" />
                <div v-else class="dropdown-item-no-cover">🎮</div>
                <div class="dropdown-item-info">
                  <span class="dropdown-item-title">{{ item.title }}</span>
                  <span v-if="item.source" class="dropdown-item-source">
                    {{ item.source === 'xbox' ? 'Xbox Live / Store' : 'Steam / PC' }}
                  </span>
                </div>
              </div>
              <div v-if="!isSearching && searchResults.length === 0" class="dropdown-status">
                Nenhum jogo encontrado.
              </div>
            </div>
          </div>
        </div>

        <div class="form-row-2">
          <!-- Plataforma -->
          <div class="form-group">
            <label class="form-label">Plataforma onde jogou</label>
            <select v-model="platform" class="retro-select">
              <option v-for="p in availablePlatforms" :key="p" :value="p">
                {{ p }}
              </option>
            </select>
          </div>

          <!-- Status -->
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="gameStatus" class="retro-select">
              <option value="playing">🎮 Jogando Atualmente</option>
              <option value="completed">🏁 Zerado / Finalizado</option>
              <option value="mastered">🏆 100% Miletado / Platinado</option>
              <option value="dropped">⏸️ Pausado / Dropado</option>
              <option value="wishlist">📌 Quero Jogar</option>
            </select>
          </div>
        </div>

        <div class="form-row-2">
          <!-- Avaliação / Nota -->
          <div class="form-group">
            <label class="form-label">Sua Nota (0 a 5)</label>
            <div class="stars-selector">
              <button
                v-for="star in [1, 2, 3, 4, 5]"
                :key="star"
                type="button"
                class="star-btn"
                :class="{ active: (rating || 0) >= star }"
                @click="setRating(star)"
              >
                ★
              </button>
              <span v-if="rating" class="rating-label">{{ rating }} / 5</span>
              <button v-if="rating" type="button" class="btn-clear-rating" @click="rating = null">
                (sem nota)
              </button>
            </div>
          </div>

          <!-- Horas Jogadas -->
          <div class="form-group">
            <label class="form-label">Horas Jogadas (opcional)</label>
            <input
              v-model.number="hoursPlayed"
              type="number"
              min="0"
              step="1"
              class="retro-input"
              placeholder="Ex: 85"
            />
          </div>
        </div>

        <!-- Resenha / Texto com suas palavras -->
        <div class="form-group">
          <label class="form-label">Sua Análise / Resenha</label>
          <textarea
            v-model="content"
            class="retro-textarea"
            rows="4"
            placeholder="O que achou da história, jogabilidade, gráficos ou da sua jornada até zerar..."
            maxlength="5000"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="closeModal">
          Cancelar
        </button>
        <button
          type="button"
          class="retro-action-btn primary"
          :disabled="isSubmitting || !gameTitle.trim()"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Publicando...' : '[ Publicar Análise ]' }}
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

.review-modal {
  width: 100%;
  max-width: 540px;
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

.modal-title {
  font-size: 0.95rem;
}

.btn-close-bracket {
  background: none;
  border: none;
  color: #fff;
  font-family: var(--font-mono, monospace);
  font-weight: bold;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.btn-close-bracket:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.error-banner {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 0.5rem 0.75rem;
  border-radius: 3px;
  font-size: 0.82rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 500px) {
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}

.form-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text, #374151);
}

.retro-input,
.retro-select,
.retro-textarea {
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 3px;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  font-family: inherit;
  background: #fff;
  color: var(--color-text, #111827);
}

.retro-input:focus,
.retro-select:focus,
.retro-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #a66130);
  box-shadow: 0 0 0 1px var(--color-primary, #a66130);
}

.stars-selector {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  color: #d1d5db;
  cursor: pointer;
  padding: 0 0.1rem;
  line-height: 1;
}

.star-btn.active {
  color: #f59e0b;
}

.rating-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #b45309;
  font-family: var(--font-mono, monospace);
  margin-left: 0.3rem;
}

.btn-clear-rating {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: #9ca3af;
  cursor: pointer;
}

.game-search-select-wrapper {
  position: relative;
  width: 100%;
}

.search-input-box {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  font-size: 0.85rem;
  color: #9ca3af;
  pointer-events: none;
}

.search-game-input {
  width: 100%;
  padding-left: 2.1rem;
  padding-right: 2.1rem;
}

.search-spinner {
  position: absolute;
  right: 0.65rem;
  font-size: 0.85rem;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.btn-clear-search {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.15rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
}

.btn-clear-search:hover {
  color: #ef4444;
}

.search-results-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 2px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s ease;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #fef3c7;
}

.dropdown-item-cover {
  width: 34px;
  height: 48px;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid #d1d5db;
  flex-shrink: 0;
  background: #f3f4f6;
}

.dropdown-item-no-cover {
  width: 34px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 2px;
  flex-shrink: 0;
  font-size: 1.1rem;
}

.dropdown-item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.dropdown-item-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item-source {
  font-size: 0.68rem;
  color: #6b7280;
  font-family: var(--font-mono, monospace);
}

.dropdown-status {
  padding: 0.75rem;
  font-size: 0.78rem;
  color: #6b7280;
  text-align: center;
  font-style: italic;
}

.selected-game-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fdfaf6;
  border: 1.5px solid var(--color-primary, #a66130);
  border-radius: 4px;
}

.selected-game-cover {
  width: 44px;
  height: 60px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #d1d5db;
  flex-shrink: 0;
  background: #fff;
}

.selected-game-no-cover {
  width: 44px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border-radius: 3px;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.selected-game-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.selected-game-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  color: #92400e;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.selected-game-title {
  font-size: 0.88rem;
  font-weight: bold;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-game-badge {
  font-size: 0.72rem;
  color: #047857;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
}

.btn-change-game {
  background: none;
  border: 1px solid var(--color-border, #d1d5db);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-primary, #a66130);
  font-family: var(--font-mono, monospace);
  font-weight: bold;
  flex-shrink: 0;
}

.btn-change-game:hover {
  background: #fee2e2;
  border-color: #f87171;
  color: #b91c1c;
}

.modal-footer {
  padding: 0.75rem 1rem;
  background: var(--color-surface-soft, #f9fafb);
  border-top: 1px solid var(--color-border, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel {
  background: none;
  border: none;
  color: #6b7280;
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
}

.btn-cancel:hover {
  color: #111827;
  text-decoration: underline;
}

.retro-action-btn.primary {
  background: var(--color-primary, #a66130);
  color: #fff;
  border: 1px solid var(--color-primary-800, #5f4120);
  padding: 0.45rem 0.9rem;
  border-radius: 3px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

.retro-action-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
