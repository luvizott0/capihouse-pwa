<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Post } from '@/types/models'
import { createGameReview } from '@/api/games'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'created', post: Post): void
}>()

const gameTitle = ref('')
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

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    boxArtFile.value = target.files[0]
  }
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
    errorMessage.value = 'Informe o título do jogo.'
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
      box_art: boxArtFile.value,
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

        <!-- Título do Jogo -->
        <div class="form-group">
          <label class="form-label">Título do Jogo *</label>
          <input
            v-model="gameTitle"
            type="text"
            class="retro-input"
            placeholder="Ex: Elden Ring, Halo Infinite, The Witcher 3..."
            maxlength="200"
            required
          />
        </div>

        <div class="form-row-2">
          <!-- Plataforma -->
          <div class="form-group">
            <label class="form-label">Plataforma</label>
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

        <!-- Capa do Jogo -->
        <div class="form-group">
          <label class="form-label">Capa do Jogo (URL ou Arquivo)</label>
          <div class="cover-inputs">
            <input
              v-model="boxArtUrl"
              type="url"
              class="retro-input"
              placeholder="https://exemplo.com/capa-do-jogo.jpg"
            />
            <div class="file-upload-wrap">
              <label class="file-label">
                📁 Upload de Imagem
                <input type="file" accept="image/*" class="hidden-file-input" @change="handleFileChange" />
              </label>
              <span v-if="boxArtFile" class="file-chosen-name">{{ boxArtFile.name }}</span>
            </div>
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

.cover-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.file-upload-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-label {
  font-size: 0.78rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 0.3rem 0.6rem;
  border-radius: 3px;
  cursor: pointer;
  color: #374151;
  font-weight: 600;
}

.file-label:hover {
  background: #e5e7eb;
}

.hidden-file-input {
  display: none;
}

.file-chosen-name {
  font-size: 0.75rem;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
