<script setup lang="ts">
import { ref } from 'vue'
import type { Post } from '@/types/models'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import PostEditModal from './PostEditModal.vue'
import { formatRelativeTime } from '@/utils/date'
import { resolveMediaUrl } from '@/utils/media'

const props = defineProps<{ post: Post }>()

const feedStore = useFeedStore()
const authStore = useAuthStore()

const showComments = ref(false)
const commentContent = ref('')
const isSubmittingComment = ref(false)
const showEditModal = ref(false)
const isAuthor = authStore.user?.id === props.post.user_id || authStore.isAdmin

const currentSlide = ref(0)
let touchStartX = 0
let touchEndX = 0

function handleTouchStart(e: TouchEvent) {
  const touch = e.changedTouches?.[0]
  if (!touch) return
  touchStartX = touch.clientX
}

function handleTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches?.[0]
  if (!touch) return
  touchEndX = touch.clientX
  const diff = touchEndX - touchStartX
  if (Math.abs(diff) > 40) {
    if (diff < 0) {
      nextSlide()
    } else {
      prevSlide()
    }
  }
}

function nextSlide() {
  if (!props.post.media?.length) return
  if (currentSlide.value < props.post.media.length - 1) {
    currentSlide.value++
  } else {
    currentSlide.value = 0
  }
}

function prevSlide() {
  if (!props.post.media?.length) return
  if (currentSlide.value > 0) {
    currentSlide.value--
  } else {
    currentSlide.value = props.post.media.length - 1
  }
}

async function handleLike() {
  await feedStore.toggleLike(props.post.id)
}

async function handleAddComment() {
  if (!commentContent.value.trim()) return
  isSubmittingComment.value = true
  try {
    await feedStore.addComment(props.post.id, commentContent.value.trim())
    commentContent.value = ''
  } finally {
    isSubmittingComment.value = false
  }
}

const showDeleteModal = ref(false)
const isDeleting = ref(false)

async function confirmDeletePost() {
  isDeleting.value = true
  try {
    await feedStore.deletePost(props.post.id)
    showDeleteModal.value = false
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="retro-post-card">
    <!-- Header: Author info & feeling -->
    <div class="post-header">
      <div class="author-row">
        <router-link :to="`/profile/${post.user.username}`" class="avatar-link">
          <UserAvatar :user="post.user" size="md" />
        </router-link>
        <div class="author-meta">
          <div class="author-name-line">
            <router-link :to="`/profile/${post.user.username}`" class="author-name">
              {{ post.user.name }}
            </router-link>
            <span class="author-handle">@{{ post.user.username }}</span>
          </div>
          <div class="post-sub-line">
            <span class="post-time">{{ formatRelativeTime(post.created_at) }}</span>
            <router-link
              v-if="post.group"
              :to="`/groups/${post.group.id}`"
              class="post-group-link"
            >
              • [ 👥 {{ post.group.name }} ]
            </router-link>
            <span v-if="post.feeling" class="feeling-indicator">
              • se sentindo <strong>{{ post.feeling.name }}</strong> {{ post.feeling.emoji }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action options for author/admin -->
      <div v-if="isAuthor" class="post-header-actions">
        <button type="button" class="action-header-btn edit-post-btn" title="Editar publicação" @click="showEditModal = true">
          [✎]
        </button>
        <button type="button" class="action-header-btn delete-post-btn" title="Excluir post" @click="showDeleteModal = true">
          [×]
        </button>
      </div>
    </div>

    <!-- Post Content -->
    <div v-if="post.content" class="post-body">
      {{ post.content }}
    </div>

    <!-- Media Carousel -->
    <div
      v-if="post.media && post.media.length"
      class="post-carousel-container"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- Track of slides -->
      <div
        class="carousel-track"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <div
          v-for="(item, index) in post.media"
          :key="item.id || index"
          class="carousel-slide"
        >
          <video
            v-if="item.type === 'video'"
            :src="resolveMediaUrl(item.url || item.path)"
            controls
            class="carousel-media"
          ></video>
          <img
            v-else
            :src="resolveMediaUrl(item.url || item.path)"
            alt="Mídia da postagem"
            class="carousel-media"
            loading="lazy"
          />
        </div>
      </div>

      <!-- Counter Badge (only if more than 1) -->
      <div v-if="post.media.length > 1" class="carousel-counter-badge">
        {{ currentSlide + 1 }} / {{ post.media.length }}
      </div>

      <!-- Navigation Arrows (only if more than 1) -->
      <template v-if="post.media.length > 1">
        <button
          type="button"
          class="carousel-nav-btn prev-btn"
          aria-label="Foto anterior"
          @click.stop="prevSlide"
        >
          ‹
        </button>
        <button
          type="button"
          class="carousel-nav-btn next-btn"
          aria-label="Próxima foto"
          @click.stop="nextSlide"
        >
          ›
        </button>
      </template>

      <!-- Dots Indicators (only if more than 1) -->
      <div v-if="post.media.length > 1" class="carousel-dots-bar">
        <button
          v-for="(_, idx) in post.media"
          :key="idx"
          type="button"
          class="carousel-dot"
          :class="{ active: currentSlide === idx }"
          :aria-label="`Ir para slide ${idx + 1}`"
          @click.stop="currentSlide = idx"
        ></button>
      </div>
    </div>

    <!-- Hashtags -->
    <div v-if="post.hashtags && post.hashtags.length" class="post-hashtags">
      <span v-for="tag in post.hashtags" :key="tag.id" class="tag-badge">
        #{{ tag.name }}
      </span>
    </div>

    <!-- Action Bar -->
    <div class="post-actions">
      <button
        type="button"
        class="action-btn like-btn"
        :class="{ liked: post.is_liked }"
        @click="handleLike"
      >
        <span class="icon">{{ post.is_liked ? '❤️' : '🤍' }}</span>
        <span>{{ post.likes_count || 0 }} {{ post.likes_count === 1 ? 'curtida' : 'curtidas' }}</span>
      </button>

      <button
        type="button"
        class="action-btn comment-btn"
        @click="showComments = !showComments"
      >
        <span class="icon">💬</span>
        <span>{{ post.comments_count || 0 }} {{ post.comments_count === 1 ? 'comentário' : 'comentários' }}</span>
      </button>
    </div>

    <!-- Comments Section (Collapsible) -->
    <div v-if="showComments" class="comments-section">
      <div v-if="post.comments && post.comments.length" class="comments-list">
        <div v-for="c in post.comments" :key="c.id" class="comment-item">
          <UserAvatar :user="c.user" size="sm" />
          <div class="comment-content-box">
            <div class="comment-user-line">
              <span class="comment-user-name">{{ c.user.name }}</span>
              <span class="comment-date">{{ formatRelativeTime(c.created_at) }}</span>
            </div>
            <p class="comment-text">{{ c.content }}</p>
          </div>
        </div>
      </div>
      <div v-else class="no-comments">
        Nenhum comentário ainda. Seja o primeiro a comentar!
      </div>

      <!-- Add Comment Input -->
      <form @submit.prevent="handleAddComment" class="comment-form">
        <input
          v-model="commentContent"
          type="text"
          placeholder="Escreva um comentário..."
          class="comment-input"
          maxlength="500"
        />
        <button
          type="submit"
          class="comment-submit-btn"
          :disabled="isSubmittingComment || !commentContent.trim()"
        >
          [ Comentar ]
        </button>
      </form>
    </div>

    <!-- Edit Post Modal -->
    <PostEditModal
      v-model="showEditModal"
      :post="post"
    />

    <!-- Confirm Delete Modal -->
    <RetroConfirmModal
      v-model="showDeleteModal"
      title="» Excluir Publicação"
      message="Tem certeza que deseja excluir esta publicação?"
      details="Essa ação é permanente e removerá todas as curtidas e comentários associados."
      confirmText="Excluir"
      :loading="isDeleting"
      @confirm="confirmDeletePost"
    />
  </div>
</template>

<style scoped>
.retro-post-card {
  border: 2px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border-bottom: 1px solid var(--color-border, #D8CDC5);
}

.author-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.avatar-link {
  text-decoration: none;
  flex-shrink: 0;
}

.author-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.author-name-line {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.author-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  font-size: 0.95rem;
  text-decoration: none;
}
.author-name:hover {
  text-decoration: underline;
}

.author-handle {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
  font-family: var(--font-heading, 'Space Mono', monospace);
}

.post-sub-line {
  font-size: 0.75rem;
  color: var(--color-muted, #847062);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.feeling-indicator {
  color: var(--color-primary-700, #7d5628);
}

.post-group-link {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  text-decoration: none;
}
.post-group-link:hover {
  text-decoration: underline;
}

.post-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.action-header-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  padding: 0.15rem 0.35rem;
  letter-spacing: -0.05em;
  line-height: 1;
}

.edit-post-btn {
  color: var(--color-primary-700, #7d5628);
}
.edit-post-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-radius: 2px;
}

.delete-post-btn {
  color: var(--color-danger, #ef4444);
}
.delete-post-btn:hover {
  background-color: #fee2e2;
  border-radius: 2px;
}

.post-body {
  padding: 1rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #222222;
}

/* Media Carousel */
.post-carousel-container {
  position: relative;
  width: 100%;
  background-color: #2b241e;
  overflow: hidden;
  user-select: none;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  aspect-ratio: 4 / 3;
  max-height: 480px;
  min-height: 280px;
}

@media (max-width: 640px) {
  .post-carousel-container {
    aspect-ratio: 1 / 1;
    max-height: 400px;
    min-height: 260px;
  }
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #241d18;
}

.carousel-media {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.carousel-counter-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.2rem 0.55rem;
  border-radius: 12px;
  pointer-events: none;
  backdrop-filter: blur(2px);
  z-index: 2;
}

.carousel-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--color-border);
  color: var(--color-primary-800);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: bold;
  font-size: 1.25rem;
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
  z-index: 2;
  user-select: none;
  line-height: 1;
}
.carousel-nav-btn:hover {
  background: #ffffff;
  color: var(--color-primary);
  transform: translateY(-50%) scale(1.08);
}
.prev-btn {
  left: 8px;
}
.next-btn {
  right: 8px;
}

.carousel-dots-bar {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  z-index: 2;
}

.carousel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background-color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}
.carousel-dot.active {
  width: 18px;
  border-radius: 4px;
  background-color: var(--color-primary, #a66130);
  border-color: #ffffff;
}

.post-hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
}
.tag-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: #ffffff;
  background-color: var(--color-primary, #a66130);
  padding: 0.18rem 0.5rem;
  border-radius: 2px;
  display: inline-block;
}

.post-actions {
  display: flex;
  gap: 1rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--color-border, #D8CDC5);
  background-color: var(--color-primary-50, #f8f6f1);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
}
.action-btn:hover {
  color: var(--color-primary, #a66130);
}
.like-btn.liked {
  color: #dc2626;
}

.comments-section {
  border-top: 2px solid var(--color-border, #D8CDC5);
  padding: 1rem;
  background-color: #faf8f5;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.comment-content-box {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
}

.comment-user-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.comment-user-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.comment-date {
  font-size: 0.7rem;
  color: var(--color-muted);
}

.comment-text {
  font-family: var(--font-body);
  font-size: 0.85rem;
  line-height: 1.4;
  color: #333333;
}

.no-comments {
  font-size: 0.8rem;
  color: var(--color-muted);
  text-align: center;
  padding: 0.5rem;
}

.comment-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.comment-input {
  flex: 1;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  font-family: var(--font-body);
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
}
.comment-input:focus {
  border-color: var(--color-primary);
}

.comment-submit-btn {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  background-color: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: 2px;
  padding: 0 0.75rem;
  cursor: pointer;
}
.comment-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
