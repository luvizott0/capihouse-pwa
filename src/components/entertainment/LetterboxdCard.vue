<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Post } from '@/types/models'
import { useAuthStore } from '@/stores/auth'
import { useImageViewerStore } from '@/stores/imageViewer'
import { toggleLike, deletePost } from '@/api/posts'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import RepostModal from './RepostModal.vue'
import { formatRelativeTime } from '@/utils/date'

const props = defineProps<{
  post: Post
}>()

const emit = defineEmits<{
  (e: 'deleted', postId: number): void
  (e: 'reposted', newPost: any): void
}>()

const authStore = useAuthStore()
const imageViewer = useImageViewerStore()

const isLiked = ref(props.post.is_liked || false)
const likesCount = ref(props.post.likes_count || 0)
const showComments = ref(false)
const showDeleteModal = ref(false)
const showRepostModal = ref(false)
const isDeleting = ref(false)

const isAuthor = computed(() => {
  return (authStore.user?.id && authStore.user.id === props.post.user_id) || authStore.isAdmin
})

const film = computed(() => props.post.metadata)

function renderRatingStars(rating?: number | null): string {
  if (rating == null) return ''
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? '½' : ''
  return '★'.repeat(full) + half
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

async function handleLikeToggle() {
  try {
    const previousState = isLiked.value
    isLiked.value = !previousState
    likesCount.value += previousState ? -1 : 1

    await toggleLike(props.post.id)
  } catch {
    // Reverter em caso de erro
    isLiked.value = !isLiked.value
    likesCount.value += isLiked.value ? 1 : -1
  }
}

async function confirmDelete() {
  isDeleting.value = true
  try {
    await deletePost(props.post.id)
    emit('deleted', props.post.id)
    showDeleteModal.value = false
  } catch (err) {
    console.error('Erro ao excluir post:', err)
  } finally {
    isDeleting.value = false
  }
}

function openPoster(url?: string | null) {
  if (url) {
    imageViewer.openImage(
      url,
      props.post.metadata?.film_title || 'Pôster',
      props.post.metadata?.film_year ? String(props.post.metadata.film_year) : undefined
    )
  }
}

function onRepostCreated(newPost: any) {
  emit('reposted', newPost)
}
</script>

<template>
  <article class="letterboxd-card retro-box">
    <!-- Header: User info + Letterboxd tag -->
    <header class="card-header">
      <div class="user-meta">
        <router-link :to="`/profile/${post.user.username}`" class="user-avatar-link">
          <UserAvatar :user="post.user" size="sm" />
        </router-link>
        <div class="user-text">
          <div class="user-name-row">
            <router-link :to="`/profile/${post.user.username}`" class="user-name">
              {{ post.user.name }}
            </router-link>
            <span class="user-handle">@{{ post.user.username }}</span>
          </div>
          <span class="post-time" :title="post.created_at">
            {{ formatRelativeTime(post.created_at) }}
          </span>
        </div>
      </div>

      <div class="header-right">
        <span class="letterboxd-badge" title="Importado via Letterboxd">
          <span class="badge-dot"></span>
          Letterboxd
        </span>

        <!-- Delete button if author/admin -->
        <button
          v-if="isAuthor"
          type="button"
          class="btn-delete"
          title="Excluir post"
          @click="showDeleteModal = true"
        >
          ✕
        </button>
      </div>
    </header>

    <!-- Main Content: Film Poster & Info -->
    <div class="film-container">
      <!-- Poster with Click to Zoom -->
      <div
        v-if="film?.poster_url"
        class="poster-wrap"
        @click="openPoster(film.poster_url)"
        title="Clique para ampliar o pôster"
      >
        <img
          :src="film.poster_url"
          :alt="film.film_title || 'Pôster do filme'"
          class="film-poster"
          loading="lazy"
        />
        <span class="zoom-hint">🔍</span>
      </div>

      <!-- Film details -->
      <div class="film-details">
        <div class="film-title-row">
          <h3 class="film-title">
            {{ film?.film_title || 'Filme' }}
          </h3>
          <span v-if="film?.film_year" class="film-year">
            ({{ film.film_year }})
          </span>
        </div>

        <!-- Rating and Rewatch -->
        <div class="film-rating-row">
          <div v-if="film?.rating" class="rating-box" :title="`Nota: ${film.rating} de 5`">
            <span class="stars">{{ renderRatingStars(film.rating) }}</span>
            <span class="rating-num">{{ film.rating }}</span>
          </div>
          <span v-else class="no-rating">Sem nota atribuída</span>

          <span v-if="film?.rewatch" class="rewatch-badge" title="Filme reassistido">
            🔁 Reassistido
          </span>
        </div>

        <!-- Watched Date -->
        <div v-if="film?.watched_date" class="watched-date">
          📅 Assistido em {{ formatDate(film.watched_date) }}
        </div>

        <!-- Review Text if present -->
        <div v-if="post.content" class="review-text">
          <p>{{ post.content }}</p>
        </div>

        <!-- External Letterboxd Link -->
        <div v-if="film?.letterboxd_url" class="letterboxd-link-row">
          <a
            :href="film.letterboxd_url"
            target="_blank"
            rel="noopener noreferrer"
            class="letterboxd-external-link"
          >
            [ Ver no Letterboxd ↗ ]
          </a>
        </div>
      </div>
    </div>

    <!-- Card Footer: Likes, Comments, Repost -->
    <footer class="card-footer">
      <div class="footer-actions-left">
        <!-- Like Button -->
        <button
          type="button"
          class="action-btn like-btn"
          :class="{ 'is-liked': isLiked }"
          @click="handleLikeToggle"
        >
          <span class="action-icon">{{ isLiked ? '♥' : '♡' }}</span>
          <span class="action-label">{{ likesCount }}</span>
        </button>

        <!-- Repost Button (Only visible for the author) -->
        <button
          v-if="isAuthor"
          type="button"
          class="action-btn repost-btn"
          title="Compartilhar esta avaliação no feed principal"
          @click="showRepostModal = true"
        >
          <span class="action-icon">🔁</span>
          <span class="action-label">Repostar no Feed</span>
        </button>
      </div>

      <div class="footer-actions-right">
        <!-- Letterboxd mini watermark -->
        <span class="source-tag">cinema</span>
      </div>
    </footer>

    <!-- Delete Confirm Modal -->
    <RetroConfirmModal
      v-model="showDeleteModal"
      title="Excluir Atividade"
      message="Tem certeza que deseja excluir esta atividade de filme? Esta ação não pode ser desfeita."
      confirm-text="Excluir"
      cancel-text="Cancelar"
      :is-danger="true"
      :is-loading="isDeleting"
      @confirm="confirmDelete"
    />

    <!-- Repost Modal -->
    <RepostModal
      v-model="showRepostModal"
      :post="post"
      @reposted="onRepostCreated"
    />
  </article>
</template>

<style scoped>
.letterboxd-card {
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.25rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.user-text {
  display: flex;
  flex-direction: column;
}

.user-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.user-name {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary-900, #3d2a14);
  text-decoration: none;
}
.user-name:hover {
  text-decoration: underline;
}

.user-handle {
  font-size: 0.8rem;
  color: #718096;
}

.post-time {
  font-size: 0.75rem;
  color: #a0aec0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.letterboxd-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: #14181c;
  color: #00e054;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.5px;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ff8000;
}

.btn-delete {
  background: none;
  border: none;
  color: #a0aec0;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
}
.btn-delete:hover {
  color: #e53e3e;
  background-color: #fff5f5;
}

/* Main Film Container */
.film-container {
  display: flex;
  gap: 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  padding: 0.85rem;
}

@media (max-width: 520px) {
  .film-container {
    flex-direction: column;
    align-items: flex-start;
  }
}

.poster-wrap {
  position: relative;
  width: 90px;
  height: 135px;
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.15);
}

.film-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.zoom-hint {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.poster-wrap:hover .zoom-hint {
  opacity: 1;
}

.film-details {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.film-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.film-title {
  font-family: var(--font-heading, monospace);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-primary-900, #3d2a14);
  margin: 0;
}

.film-year {
  font-size: 0.9rem;
  color: #718096;
}

.film-rating-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.rating-box {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.stars {
  color: #00c030;
  font-size: 1.1rem;
  letter-spacing: 1px;
}

.rating-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: #4a5568;
  font-family: var(--font-mono, monospace);
}

.no-rating {
  font-size: 0.8rem;
  color: #a0aec0;
  font-style: italic;
}

.rewatch-badge {
  font-size: 0.75rem;
  color: #2b6cb0;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
}

.watched-date {
  font-size: 0.8rem;
  color: #718096;
  font-family: var(--font-mono, monospace);
}

.review-text {
  font-size: 0.9rem;
  color: var(--color-primary-900, #3d2a14);
  line-height: 1.5;
  background-color: #ffffff;
  border-left: 3px solid #00c030;
  padding: 0.5rem 0.75rem;
  margin-top: 0.25rem;
  border-radius: 0 3px 3px 0;
}

.letterboxd-link-row {
  margin-top: 0.35rem;
}

.letterboxd-external-link {
  font-size: 0.8rem;
  color: var(--color-primary, #a66130);
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-mono, monospace);
}
.letterboxd-external-link:hover {
  text-decoration: underline;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border, #D8CDC5);
}

.footer-actions-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: 1px solid var(--color-border, #D8CDC5);
  background-color: var(--color-primary-50, #f8f6f1);
  color: var(--color-primary-800, #5f4120);
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  font-family: var(--font-mono, monospace);
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
}

.like-btn.is-liked {
  color: #e53e3e;
  border-color: #feb2b2;
  background-color: #fff5f5;
}

.repost-btn:hover {
  color: #2b6cb0;
  border-color: #63b3ed;
  background-color: #ebf8ff;
}

.source-tag {
  font-size: 0.7rem;
  color: #a0aec0;
  font-family: var(--font-mono, monospace);
  text-transform: uppercase;
}
</style>
