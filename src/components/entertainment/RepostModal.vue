<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Post } from '@/types/models'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { resolveMediaUrl } from '@/utils/media'
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
const feelingText = ref('')
const feelingEmoji = ref('😊')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const isSubmitting = ref(false)
const errorMessage = ref('')

const isEntertainment = computed(() => {
  return props.post?.category === 'entertainment' || !!props.post?.entertainment_type || !!props.post?.metadata?.film_title || !!props.post?.metadata?.game_title
})

const film = computed(() => isEntertainment.value ? props.post?.metadata : null)

const placeholderText = computed(() => {
  if (isEntertainment.value) {
    return props.post?.entertainment_type === 'game'
      ? 'O que achou deste jogo? Escreva algo para seus amigos no feed...'
      : 'O que achou deste filme? Escreva algo para seus amigos no feed...'
  }
  return 'O que achou desta publicação? Adicione seu comentário...'
})

function clearFeeling() {
  feelingText.value = ''
  feelingEmoji.value = '😊'
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

    if (feelingText.value.trim()) {
      formData.append('feeling_name', feelingText.value.trim().substring(0, 15))
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

      <!-- Preview of Film/Game to be reposted -->
      <div v-if="isEntertainment && film" class="film-preview-card">
        <img
          v-if="film.poster_url || film.box_art_url"
          :src="film.poster_url || film.box_art_url || ''"
          :alt="film.film_title || film.game_title || 'Capa/Poster'"
          class="preview-poster"
        />
        <div class="preview-info">
          <span
            v-if="post?.entertainment_type === 'game'"
            class="preview-badge"
            :class="post?.external_source === 'xbox' ? 'xbox-badge' : 'game-badge'"
          >
            {{ post?.external_source === 'xbox' ? '🎮 Xbox Live' : '🕹️ Análise de Jogo' }}
          </span>
          <span v-else class="preview-badge letterboxd-badge">🍿 Letterboxd</span>
          <h4 class="preview-title">
            {{ film.film_title || film.game_title }}
            <span v-if="film.film_year" class="preview-year">({{ film.film_year }})</span>
            <span v-else-if="film.platform" class="preview-year">[{{ film.platform }}]</span>
          </h4>
          <div v-if="film.rating" class="preview-rating">
            <span class="stars">{{ renderRatingStars(film.rating) }}</span>
            <span class="numeric-rating">{{ film.rating }} / 5</span>
          </div>
          <div v-else-if="film.gamerscore != null" class="preview-rating">
            <span class="numeric-rating">🎮 {{ film.gamerscore }} G</span>
          </div>
          <p v-if="post?.content" class="preview-snippet">
            "{{ post.content.length > 100 ? post.content.slice(0, 100) + '...' : post.content }}"
          </p>
        </div>
      </div>

      <!-- Preview of Regular Feed Post -->
      <div v-else-if="post" class="feed-preview-card">
        <div class="feed-preview-header">
          <UserAvatar :user="post.user" size="sm" />
          <div class="feed-preview-author">
            <span class="feed-preview-name">{{ post.user?.name || 'Usuário' }}</span>
            <span class="feed-preview-username">@{{ post.user?.username }}</span>
          </div>
          <span class="preview-badge feed-badge">💬 Publicação</span>
        </div>
        <p v-if="post.content" class="feed-preview-snippet">
          "{{ post.content.length > 160 ? post.content.slice(0, 160) + '...' : post.content }}"
        </p>
        <div v-if="post.media && post.media.length && post.media[0]" class="feed-preview-media">
          <img
            v-if="post.media[0]?.type !== 'video'"
            :src="resolveMediaUrl(post.media[0]?.url || post.media[0]?.path)"
            alt="Mídia da postagem"
            class="feed-preview-thumb"
          />
          <div v-else class="feed-preview-video-box">
            🎬 Vídeo anexo
          </div>
          <span v-if="post.media.length > 1" class="preview-media-count">
            +{{ post.media.length - 1 }} arquivo(s)
          </span>
        </div>
      </div>

      <!-- User Commentary -->
      <div class="form-group">
        <label class="form-label">Adicionar seu comentário (opcional):</label>
        <textarea
          v-model="content"
          class="retro-textarea"
          rows="3"
          :placeholder="placeholderText"
          maxlength="2000"
        ></textarea>
      </div>

      <!-- Feelings Section with EmojiPicker (identical to feed form) -->
      <div class="feelings-section">
        <div class="section-label">Como você está se sentindo?</div>

        <div class="custom-feeling-row">
          <EmojiPicker v-model="feelingEmoji" />
          <div class="feeling-text-wrapper">
            <input
              v-model="feelingText"
              type="text"
              maxlength="15"
              placeholder="Me sentindo..."
              class="feeling-text-input"
            />
            <span class="char-count">{{ feelingText.length }}/15</span>
          </div>
          <button
            v-if="feelingText"
            type="button"
            class="clear-feeling-btn"
            @click="clearFeeling"
            title="Limpar sentimento"
          >
            ×
          </button>
        </div>
      </div>

      <!-- Hashtags Section (identical to feed form) -->
      <div class="hashtag-section">
        <div class="hashtag-input-group">
          <input
            v-model="hashtagInput"
            placeholder="#adicionar_tag"
            class="retro-tag-field"
            @keydown.enter.prevent="addHashtag"
          />
          <button type="button" class="add-tag-btn" @click="addHashtag">[ + ]</button>
        </div>
        <div v-if="hashtags.length" class="tags-container">
          <span v-for="tag in hashtags" :key="tag" class="retro-post-tag">
            #{{ tag }}
            <button type="button" class="remove-tag-x" @click="removeHashtag(tag)">×</button>
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
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  width: fit-content;
  line-height: 1.2;
}

.preview-badge.letterboxd-badge {
  background-color: #ffedd5;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.preview-badge.xbox-badge {
  background-color: #e8f5e9;
  color: #107c10;
  border: 1px solid #c8e6c9;
}

.preview-badge.game-badge {
  background-color: #f3e8ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}

.preview-badge.feed-badge {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.feed-preview-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
}

.feed-preview-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feed-preview-author {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.feed-preview-name {
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary-900, #3d2a14);
  line-height: 1.2;
}

.feed-preview-username {
  font-size: 0.75rem;
  color: #718096;
  font-family: var(--font-mono, monospace);
}

.feed-preview-snippet {
  font-size: 0.85rem;
  color: var(--color-primary-800, #4a3b2c);
  font-style: italic;
  margin: 0;
  line-height: 1.4;
  white-space: pre-line;
}

.feed-preview-media {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.feed-preview-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 3px;
}

.feed-preview-video-box {
  padding: 0.35rem 0.6rem;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  font-size: 0.75rem;
  color: #475569;
}

.preview-media-count {
  font-size: 0.75rem;
  color: #718096;
  font-family: var(--font-mono, monospace);
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

/* Feelings Section (identical to PostCreateModal) */
.feelings-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  margin-bottom: 0.2rem;
  text-transform: uppercase;
}

.custom-feeling-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.feeling-text-wrapper {
  position: relative;
  flex: 1 1 0%;
  min-width: 0;
}

.feeling-text-input {
  width: 100%;
  padding: 0.45rem 2.8rem 0.45rem 0.6rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.85rem;
  border: 2px solid var(--color-primary-200, #d5bba2);
  background-color: var(--color-primary-50, #f8f6f1);
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.feeling-text-input:focus {
  border-color: var(--color-primary, #a66130);
}

.char-count {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  font-family: var(--font-heading, monospace);
  color: var(--color-muted, #847062);
}

.clear-feeling-btn {
  background: none;
  border: 1px solid var(--color-border, #D8CDC5);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  border-radius: 2px;
  color: var(--color-danger, #ef4444);
}
.clear-feeling-btn:hover {
  background-color: #fee2e2;
}

/* Hashtags Section (identical to PostCreateModal) */
.hashtag-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hashtag-input-group {
  display: flex;
  gap: 0.5rem;
}

.retro-tag-field {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  border: 1px solid var(--color-border, #D8CDC5);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.retro-tag-field:focus {
  border-color: var(--color-primary, #a66130);
}

.add-tag-btn {
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  background: var(--color-primary, #a66130);
  color: white;
  border: none;
  padding: 0 0.75rem;
  cursor: pointer;
  border-radius: 2px;
  font-size: 0.85rem;
}
.add-tag-btn:hover {
  background-color: var(--color-primary-800, #5f4120);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.retro-post-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  border-radius: 2px;
}

.remove-tag-x {
  background: none;
  border: none;
  cursor: pointer;
  color: #ffffff;
  font-weight: bold;
  font-size: 0.85rem;
  line-height: 1;
  padding: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
