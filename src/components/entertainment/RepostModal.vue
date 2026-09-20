<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Post } from '@/types/models'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import { createPost } from '@/api/posts'

const props = defineProps<{
  modelValue: boolean
  post: Post | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'reposted', newPost: any): void
}>()

const content = ref('')
const feelingName = ref('')
const feelingEmoji = ref('😊')
const showEmojiPicker = ref(false)
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const isSubmitting = ref(false)
const errorMessage = ref('')

const film = computed(() => props.post?.metadata)

function selectEmoji(emoji: string) {
  feelingEmoji.value = emoji
  showEmojiPicker.value = false
}

function clearFeeling() {
  feelingEmoji.value = '😊'
  feelingName.value = ''
}

function addHashtag() {
  const clean = hashtagInput.value.trim().replace(/^#/, '')
  if (clean && !hashtags.value.includes(clean)) {
    hashtags.value.push(clean)
  }
  hashtagInput.value = ''
}

function removeHashtag(tag: string) {
  hashtags.value = hashtags.value.filter((t) => t !== tag)
}

function renderRatingStars(rating?: number | null): string {
  if (rating == null) return ''
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? '½' : ''
  return '★'.repeat(full) + half
}

async function handleRepost() {
  if (!props.post) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    if (content.value.trim()) {
      formData.append('content', content.value.trim())
    }
    formData.append('repost_of_id', String(props.post.id))

    if (feelingName.value.trim()) {
      formData.append('feeling_name', feelingName.value.trim().substring(0, 15))
      formData.append('feeling_emoji', feelingEmoji.value || '😊')
    }

    hashtags.value.forEach((tag) => {
      formData.append('hashtags[]', tag)
    })

    const response = await createPost(formData)
    emit('reposted', response.data)
    emit('update:modelValue', false)
    content.value = ''
    clearFeeling()
    hashtags.value = []
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Erro ao repostar publicação.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <RetroModal
    :model-value="modelValue"
    title="» Repostar no Feed"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="repost-modal-body">
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <!-- Preview of Film to be reposted -->
      <div v-if="film" class="film-preview-card">
        <img
          v-if="film.poster_url"
          :src="film.poster_url"
          :alt="film.film_title || 'Poster'"
          class="preview-poster"
        />
        <div class="preview-info">
          <span class="preview-badge">🍿 Letterboxd</span>
          <h4 class="preview-title">
            {{ film.film_title }}
            <span v-if="film.film_year" class="preview-year">({{ film.film_year }})</span>
          </h4>
          <div v-if="film.rating" class="preview-rating">
            <span class="stars">{{ renderRatingStars(film.rating) }}</span>
            <span class="numeric-rating">{{ film.rating }} / 5</span>
          </div>
          <p v-if="post?.content" class="preview-snippet">
            "{{ post.content.length > 100 ? post.content.slice(0, 100) + '...' : post.content }}"
          </p>
        </div>
      </div>

      <!-- User Commentary -->
      <div class="form-group">
        <label class="form-label">Adicionar seu comentário (opcional):</label>
        <textarea
          v-model="content"
          class="retro-textarea"
          rows="3"
          placeholder="O que achou deste filme? Escreva algo para seus amigos no feed..."
          maxlength="2000"
        ></textarea>
      </div>

      <!-- Feeling Section -->
      <div class="feeling-section">
        <label class="form-label">Sentimento:</label>
        <div class="feeling-row">
          <div v-if="feelingName.trim()" class="active-feeling-badge">
            <span>Sentindo-se {{ feelingEmoji }} {{ feelingName }}</span>
            <button type="button" class="btn-clear-feeling" @click="clearFeeling">×</button>
          </div>
          <div v-else class="feeling-inputs">
            <button
              type="button"
              class="btn-pick-emoji"
              @click="showEmojiPicker = !showEmojiPicker"
              title="Escolher emoji de sentimento"
            >
              {{ feelingEmoji }}
            </button>
            <input
              v-model="feelingName"
              type="text"
              class="retro-field feeling-name-field"
              placeholder="Sentindo-se... (ex: animado, pensativo)"
              maxlength="15"
            />
          </div>

          <div v-if="showEmojiPicker" class="emoji-picker-container">
            <EmojiPicker @select="selectEmoji" />
          </div>
        </div>
      </div>

      <!-- Hashtags Section -->
      <div class="hashtags-section">
        <label class="form-label">Hashtags:</label>
        <div class="hashtag-input-row">
          <span class="hashtag-prefix">#</span>
          <input
            v-model="hashtagInput"
            type="text"
            class="retro-field hashtag-field"
            placeholder="cinema, favorito..."
            maxlength="50"
            @keydown.enter.prevent="addHashtag"
          />
          <button
            type="button"
            class="btn-add-hashtag"
            :disabled="!hashtagInput.trim()"
            @click="addHashtag"
          >
            + Adicionar
          </button>
        </div>

        <div v-if="hashtags.length" class="hashtags-list">
          <span v-for="tag in hashtags" :key="tag" class="hashtag-chip">
            #{{ tag }}
            <button type="button" class="btn-remove-tag" @click="removeHashtag(tag)">×</button>
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <RetroButton
          variant="secondary"
          type="button"
          :disabled="isSubmitting"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </RetroButton>
        <RetroButton
          variant="primary"
          type="button"
          :disabled="isSubmitting"
          @click="handleRepost"
        >
          {{ isSubmitting ? 'Publicando...' : '🔁 Repostar no Feed' }}
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.repost-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-banner {
  background-color: #ffe6e6;
  border: 1px solid #cc0000;
  color: #cc0000;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-family: var(--font-mono, monospace);
}

.film-preview-card {
  display: flex;
  gap: 0.85rem;
  padding: 0.75rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
}

.preview-poster {
  width: 55px;
  height: 82px;
  object-fit: cover;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  flex-shrink: 0;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.preview-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  color: #00c030;
  font-family: var(--font-mono, monospace);
  text-transform: uppercase;
}

.preview-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-900, #3d2a14);
  margin: 0;
}

.preview-year {
  font-weight: 400;
  color: #718096;
}

.preview-rating {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.stars {
  color: #00c030;
  letter-spacing: 1px;
}

.numeric-rating {
  font-size: 0.75rem;
  color: #718096;
  font-family: var(--font-mono, monospace);
}

.preview-snippet {
  font-size: 0.8rem;
  color: #4a5568;
  font-style: italic;
  margin: 0.25rem 0 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary-800, #5f4120);
  font-family: var(--font-mono, monospace);
}

.retro-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  color: var(--color-primary-900, #3d2a14);
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.retro-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #a66130);
}

.feeling-row {
  position: relative;
}

.feeling-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-pick-emoji {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  font-size: 1.25rem;
  cursor: pointer;
}

.feeling-name-field {
  flex: 1;
}

.retro-field {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  color: var(--color-primary-900, #3d2a14);
  font-size: 0.85rem;
}

.active-feeling-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  background-color: var(--color-primary-100, #fdf8f3);
  border: 1px solid var(--color-primary, #a66130);
  font-size: 0.85rem;
  color: var(--color-primary-900, #3d2a14);
}

.btn-clear-feeling {
  background: none;
  border: none;
  color: #cc0000;
  font-weight: bold;
  cursor: pointer;
  padding: 0 0.2rem;
}

.emoji-picker-container {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  margin-top: 0.25rem;
  background: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hashtags-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.hashtag-input-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.hashtag-prefix {
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  color: var(--color-primary, #a66130);
  font-size: 1rem;
}

.hashtag-field {
  flex: 1;
}

.btn-add-hashtag {
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  border-radius: 2px;
}
.btn-add-hashtag:hover:not(:disabled) {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
}
.btn-add-hashtag:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hashtags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.hashtag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: var(--color-primary-100, #fdf8f3);
  border: 1px solid var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-family: var(--font-mono, monospace);
  border-radius: 2px;
}

.btn-remove-tag {
  background: none;
  border: none;
  color: #cc0000;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
