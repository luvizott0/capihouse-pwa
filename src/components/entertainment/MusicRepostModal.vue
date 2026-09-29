<script setup lang="ts">
import { ref, computed } from 'vue'
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

const isLastFm = computed(() => {
  const anyTrack = props.track as Record<string, any> | null
  return anyTrack?.source === 'lastfm' || (!props.track?.spotify_url && !!anyTrack?.lastfm_url)
})

const trackArtist = computed(() => {
  const anyTrack = props.track as Record<string, any> | null
  return props.track?.artist || anyTrack?.track_artist || ''
})

const trackAlbum = computed(() => {
  const anyTrack = props.track as Record<string, any> | null
  return props.track?.album || anyTrack?.track_album || ''
})

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
      artist: trackArtist.value,
      album: trackAlbum.value,
      album_art: props.track.album_art || null,
      spotify_url: props.track.spotify_url || null,
      preview_url: props.track.preview_url || null,
      duration_ms: props.track.duration_ms || 0,
    }

    const payload = {
      track: normalizedTrack,
      source: isLastFm.value ? 'lastfm' : 'spotify',
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
  <RetroModal
    :model-value="modelValue"
    title="» Repostar no Feed"
    size="md"
    @update:model-value="closeModal"
  >
    <div class="repost-modal-body">
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <!-- Preview of Music to be reposted (matching standard film-preview-card) -->
      <div v-if="track" class="film-preview-card">
        <img
          v-if="track.album_art"
          :src="track.album_art"
          :alt="track.title"
          class="preview-poster"
        />
        <div v-else class="preview-poster preview-placeholder">🎵</div>
        <div class="preview-info">
          <span
            class="preview-badge"
            :class="isLastFm ? 'lastfm-badge' : 'spotify-badge'"
          >
            {{ isLastFm ? '🔴 Last.fm' : '🎵 Spotify' }}
          </span>
          <h4 class="preview-title">
            {{ track.title }}
            <span v-if="trackArtist" class="preview-year">• {{ trackArtist }}</span>
          </h4>
          <p v-if="trackAlbum" class="preview-album-name">
            Álbum: <em>{{ trackAlbum }}</em>
          </p>
          <p v-if="fromUsername" class="preview-snippet">
            Compartilhado do perfil de @{{ fromUsername }}
          </p>
        </div>
      </div>

      <!-- User Commentary with Mentions Support -->
      <div class="form-group">
        <label class="form-label">Adicionar seu comentário (opcional):</label>
        <MentionInput
          v-model="content"
          :rows="3"
          placeholder="O que achou desta música? Use @ para marcar amigos ou @todos..."
          :maxlength="2000"
        />
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
          @click="closeModal"
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
  width: 58px;
  height: 58px;
  object-fit: cover;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  flex-shrink: 0;
}

.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-100, #f1ede8);
  font-size: 1.5rem;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  justify-content: center;
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

.preview-badge.spotify-badge {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.preview-badge.lastfm-badge {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.preview-album-name {
  font-size: 0.75rem;
  color: #718096;
  margin: 0;
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

.preview-snippet {
  font-size: 0.8rem;
  color: #4a5568;
  font-style: italic;
  margin: 0.15rem 0 0;
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

/* Feelings Section (identical to RepostModal / PostCreateModal) */
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

/* Hashtags Section (identical to RepostModal / PostCreateModal) */
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
