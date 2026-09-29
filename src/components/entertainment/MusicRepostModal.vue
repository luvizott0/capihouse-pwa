<script setup lang="ts">
import { ref } from 'vue'
import type { SpotifyTrack, SpotifyNowPlaying, Post } from '@/types/models'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import EmojiPicker from '@/components/ui/EmojiPicker.vue'
import MentionInput from '@/components/ui/MentionInput.vue'
import { repostSpotifyTrack } from '@/api/spotify'

const props = defineProps<{
  modelValue: boolean
  track: SpotifyTrack | SpotifyNowPlaying | null
  fromUsername?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'reposted', newPost: Post): void
}>()

const content = ref('')
const feelingText = ref('')
const feelingEmoji = ref('🎵')
const hashtagInput = ref('')
const hashtags = ref<string[]>([])
const isSubmitting = ref(false)
const errorMessage = ref('')

function clearFeeling() {
  feelingText.value = ''
  feelingEmoji.value = '🎵'
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

function closeModal() {
  emit('update:modelValue', false)
  content.value = ''
  clearFeeling()
  hashtags.value = []
  errorMessage.value = ''
}

async function handleRepost() {
  if (!props.track || !props.track.title) return
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const anyTrack = props.track as Record<string, any>
    const normalizedTrack: SpotifyTrack = {
      id: String(anyTrack.track_id || anyTrack.id || ''),
      title: props.track.title,
      artist: props.track.artist || '',
      album: props.track.album || '',
      album_art: props.track.album_art || null,
      spotify_url: props.track.spotify_url || null,
      preview_url: props.track.preview_url || null,
      duration_ms: props.track.duration_ms || 0,
    }

    const payload = {
      track: normalizedTrack,
      content: content.value.trim() || undefined,
      feeling_name: feelingText.value.trim().substring(0, 15) || undefined,
      feeling_emoji: feelingEmoji.value || '🎵',
      hashtags: hashtags.value.length ? hashtags.value : undefined,
      from_user: props.fromUsername || undefined,
    }

    const res = await repostSpotifyTrack(payload)
    emit('reposted', res.data.post)
    closeModal()
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    errorMessage.value = msg || 'Erro ao compartilhar música no feed.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <RetroModal :model-value="modelValue" @update:model-value="closeModal">
    <div class="music-repost-modal">
      <div class="modal-header">
        <h3 class="modal-title">
          <span>🔁 Repostar Música no Feed</span>
        </h3>
      </div>

      <div class="modal-body">
        <p class="section-lead-desc">
          Compartilhe esta música com todos os amigos da casa no Feed principal!
        </p>

        <!-- Preview da Música Repostada -->
        <div v-if="track" class="track-preview-box">
          <div class="track-preview-header">
            <span class="spotify-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#1DB954">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.306c-.218.358-.682.473-1.04.254-2.854-1.743-6.446-2.138-10.678-1.171-.409.093-.815-.162-.909-.57-.093-.408.162-.814.57-.908 4.637-1.06 8.608-.61 11.803 1.345.358.219.473.682.254 1.05zm1.472-3.276c-.274.446-.86.588-1.306.314-3.267-2.008-8.246-2.59-12.11-1.417-.499.152-1.03-.133-1.182-.633-.152-.5.133-1.03.633-1.182 4.417-1.34 9.914-.693 13.651 1.612.446.274.588.86.314 1.306zm.126-3.41C15.202 8.293 8.76 8.08 5.097 9.193c-.6.182-1.237-.16-1.419-.76-.182-.6.16-1.236.76-1.418 4.22-1.282 11.332-1.036 15.727 1.574.54.32.716 1.026.396 1.566-.32.54-1.026.716-1.566.396z"/>
              </svg>
              <span>Spotify</span>
            </span>
            <span v-if="fromUsername" class="from-user-tag">
              Música de @{{ fromUsername }}
            </span>
          </div>

          <div class="track-preview-content">
            <img
              v-if="track.album_art"
              :src="track.album_art"
              :alt="track.title"
              class="preview-album-art"
            />
            <div v-else class="preview-placeholder">🎵</div>

            <div class="preview-track-meta">
              <strong class="preview-track-title" :title="track.title">{{ track.title }}</strong>
              <span class="preview-track-artist">{{ track.artist }}</span>
              <span v-if="track.album" class="preview-track-album">{{ track.album }}</span>
            </div>
          </div>
        </div>

        <!-- Campo de Comentário -->
        <div class="form-group">
          <label class="form-label">Seu comentário ou reação (opcional):</label>
          <MentionInput
            v-model="content"
            placeholder="O que você achou dessa música? Use @ para marcar amigos..."
            :rows="3"
            class="retro-textarea"
          />
        </div>

        <!-- Sentimento / Humor -->
        <div class="form-group">
          <label class="form-label">Como você se sente ouvindo isso? (opcional):</label>
          <div class="feeling-row">
            <EmojiPicker v-model="feelingEmoji" />
            <input
              v-model="feelingText"
              type="text"
              maxlength="15"
              placeholder="ex: vibe boa, nostálgico..."
              class="retro-input feeling-input"
            />
            <button
              v-if="feelingText"
              type="button"
              class="clear-btn"
              @click="clearFeeling"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Hashtags -->
        <div class="form-group">
          <label class="form-label">Hashtags (opcional):</label>
          <div class="hashtag-input-row">
            <input
              v-model="hashtagInput"
              type="text"
              placeholder="adicionar tag (Enter)..."
              class="retro-input"
              @keydown.enter.prevent="addHashtag"
            />
            <button type="button" class="btn-add-tag" @click="addHashtag">+ Tag</button>
          </div>
          <div v-if="hashtags.length" class="tags-container">
            <span v-for="tag in hashtags" :key="tag" class="tag-pill">
              #{{ tag }}
              <button type="button" class="remove-tag" @click="removeHashtag(tag)">×</button>
            </span>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <RetroButton variant="secondary" @click="closeModal">
          Cancelar
        </RetroButton>
        <RetroButton
          variant="primary"
          :loading="isSubmitting"
          @click="handleRepost"
        >
          🔁 Publicar no Feed
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.music-repost-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-header {
  border-bottom: 2px solid var(--color-border, #4a3728);
  padding-bottom: 0.5rem;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-primary-800, #2c442c);
  font-family: var(--font-heading, monospace);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.section-lead-desc {
  font-size: 0.82rem;
  color: var(--color-text-muted, #666);
  margin: 0 0 0.75rem 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Track Preview Box */
.track-preview-box {
  background: var(--color-surface-soft, #f8fafc);
  border: 1px solid #1db954;
  border-radius: 4px;
  padding: 0.65rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.track-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.spotify-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #15803d;
  font-family: var(--font-heading, monospace);
}

.from-user-tag {
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  font-style: italic;
}

.track-preview-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-album-art {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.preview-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.preview-track-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.1rem;
}

.preview-track-title {
  font-size: 0.92rem;
  color: var(--color-text, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-track-artist {
  font-size: 0.8rem;
  color: #16a34a;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-track-album {
  font-size: 0.72rem;
  color: var(--color-text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-muted, #475569);
  font-family: var(--font-heading, monospace);
}

.feeling-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.feeling-input {
  flex: 1;
}

.clear-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0 0.3rem;
  font-size: 0.85rem;
}

.clear-btn:hover {
  color: #ef4444;
}

.hashtag-input-row {
  display: flex;
  gap: 0.4rem;
}

.btn-add-tag {
  background: var(--color-primary-100, #f1f5f9);
  border: 1px solid var(--color-border, #cbd5e1);
  color: var(--color-primary-800, #334155);
  font-size: 0.78rem;
  padding: 0 0.6rem;
  border-radius: 3px;
  cursor: pointer;
  font-family: var(--font-heading, monospace);
}

.btn-add-tag:hover {
  background: var(--color-primary-200, #e2e8f0);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  color: #334155;
  font-family: var(--font-heading, monospace);
}

.remove-tag {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1;
}

.remove-tag:hover {
  color: #ef4444;
}

.error-banner {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
  padding: 0.5rem 0.75rem;
  border-radius: 3px;
  font-size: 0.78rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding-top: 0.75rem;
}
</style>
