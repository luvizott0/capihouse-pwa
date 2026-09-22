<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Post, PostComment } from '@/types/models'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useEntertainmentStore } from '@/stores/entertainment'
import { useImageViewerStore } from '@/stores/imageViewer'
import {
  toggleLike,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from '@/api/posts'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import RepostModal from './RepostModal.vue'
import MentionInput from '@/components/ui/MentionInput.vue'
import FormattedContent from '@/components/ui/FormattedContent.vue'
import { formatRelativeTime } from '@/utils/date'

const props = withDefaults(
  defineProps<{
    post: Post
    defaultShowComments?: boolean
  }>(),
  {
    defaultShowComments: false,
  }
)

const emit = defineEmits<{
  (e: 'deleted', postId: number): void
  (e: 'reposted', newPost: any): void
}>()

const authStore = useAuthStore()
const feedStore = useFeedStore()
const entertainmentStore = useEntertainmentStore()
const imageViewer = useImageViewerStore()

const isLiked = ref(props.post.is_liked || false)
const likesCount = ref(props.post.likes_count || 0)
const showComments = ref(props.defaultShowComments)
const showDeleteModal = ref(false)
const showRepostModal = ref(false)
const isDeleting = ref(false)

watch(
  () => props.post.is_liked,
  (val) => {
    isLiked.value = val ?? false
  }
)

watch(
  () => props.post.likes_count,
  (val) => {
    likesCount.value = val ?? 0
  }
)

const isAuthor = computed(() => {
  return (authStore.user?.id && authStore.user.id === props.post.user_id) || authStore.isAdmin
})

const game = computed(() => props.post.metadata)

function renderRatingStars(rating?: number | null): string {
  if (rating == null) return ''
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? '½' : ''
  return '★'.repeat(full) + half
}

async function handleLikeToggle() {
  const previousState = isLiked.value
  const previousCount = likesCount.value
  const nextLiked = !previousState
  const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))

  isLiked.value = nextLiked
  likesCount.value = nextCount

  try {
    const res = await toggleLike(props.post.id)
    isLiked.value = res.data.is_liked
    likesCount.value = res.data.likes_count
    props.post.is_liked = res.data.is_liked
    props.post.likes_count = res.data.likes_count

    const postInEnt = entertainmentStore.posts.find(p => p.id === props.post.id)
    if (postInEnt && postInEnt !== props.post) {
      postInEnt.is_liked = res.data.is_liked
      postInEnt.likes_count = res.data.likes_count
    }

    const postInUser = feedStore.userPosts.find(p => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) {
      postInUser.is_liked = res.data.is_liked
      postInUser.likes_count = res.data.likes_count
    }
  } catch {
    isLiked.value = previousState
    likesCount.value = previousCount
  }
}

async function confirmDelete() {
  isDeleting.value = true
  try {
    await deletePost(props.post.id)
    showDeleteModal.value = false
    emit('deleted', props.post.id)
  } catch (err) {
    console.error('Erro ao excluir post de jogo:', err)
  } finally {
    isDeleting.value = false
  }
}

function handleRepostSuccess(repost: any) {
  showRepostModal.value = false
  emit('reposted', repost)
}

function openBoxArt(url?: string | null) {
  if (url) {
    imageViewer.openImage(url)
  }
}

// Comments logic
const commentContent = ref('')
const isSubmittingComment = ref(false)
const replyingTo = ref<PostComment | null>(null)
const editingCommentId = ref<number | null>(null)
const editCommentText = ref('')
const deletingCommentId = ref<number | null>(null)

const commentsList = computed(() => props.post.comments || [])

function startReply(comment: PostComment) {
  replyingTo.value = comment
  commentContent.value = `@${comment.user.username} `
  nextTick(() => {
    const input = document.getElementById(`game-comment-input-${props.post.id}`)
    input?.focus()
  })
}

function cancelReply() {
  replyingTo.value = null
  commentContent.value = ''
}

async function handleAddComment() {
  if (!commentContent.value.trim() || isSubmittingComment.value) return
  isSubmittingComment.value = true

  try {
    const parentId = replyingTo.value ? replyingTo.value.id : undefined
    const res = await addComment(props.post.id, commentContent.value.trim(), parentId)
    if (!props.post.comments) props.post.comments = []
    props.post.comments.push(res.data)
    props.post.comments_count = (props.post.comments_count || 0) + 1
    commentContent.value = ''
    replyingTo.value = null
  } catch (err) {
    console.error('Erro ao comentar em jogo:', err)
  } finally {
    isSubmittingComment.value = false
  }
}

async function handleToggleCommentLike(comment: PostComment) {
  const prevLiked = !!comment.is_liked
  const prevCount = comment.likes_count || 0
  comment.is_liked = !prevLiked
  comment.likes_count = Math.max(0, prevCount + (comment.is_liked ? 1 : -1))

  try {
    const res = await toggleCommentLike(comment.id)
    comment.is_liked = res.data.is_liked
    comment.likes_count = res.data.likes_count
  } catch {
    comment.is_liked = prevLiked
    comment.likes_count = prevCount
  }
}

function startEditComment(comment: PostComment) {
  editingCommentId.value = comment.id
  editCommentText.value = comment.content
}

async function saveEditComment(comment: PostComment) {
  if (!editCommentText.value.trim()) return
  try {
    const res = await updateComment(comment.id, editCommentText.value.trim())
    comment.content = res.data.content
    editingCommentId.value = null
  } catch (err) {
    console.error('Erro ao editar comentário:', err)
  }
}

async function confirmDeleteComment(commentId: number) {
  try {
    await deleteComment(commentId)
    if (props.post.comments) {
      props.post.comments = props.post.comments.filter(c => c.id !== commentId)
      props.post.comments_count = Math.max(0, (props.post.comments_count || 1) - 1)
    }
    deletingCommentId.value = null
  } catch (err) {
    console.error('Erro ao excluir comentário:', err)
  }
}

const statusLabel = computed(() => {
  const s = game.value?.game_status
  if (s === 'mastered' || (game.value?.progress_percentage ?? 0) >= 100) {
    return { text: '🏆 100% Miletado', class: 'status-mastered' }
  }
  if (s === 'completed') {
    return { text: '🏁 Zerado / Finalizado', class: 'status-completed' }
  }
  if (s === 'dropped') {
    return { text: '⏸️ Pausado / Dropado', class: 'status-dropped' }
  }
  if (s === 'wishlist') {
    return { text: '📌 Quero Jogar', class: 'status-wishlist' }
  }
  return { text: '🎮 Jogando', class: 'status-playing' }
})
</script>

<template>
  <article class="game-card retro-box">
    <!-- Header: User info + Delete action -->
    <header class="card-header">
      <div class="user-meta">
        <router-link :to="`/profile/${post.user.username}`" class="user-avatar-link">
          <UserAvatar :user="post.user" size="md" />
        </router-link>
        <div class="user-text">
          <router-link :to="`/profile/${post.user.username}`" class="user-name">
            {{ post.user.name }}
          </router-link>
          <span class="user-handle">@{{ post.user.username }}</span>
          <div class="user-sub-line">
            <span class="post-time" :title="post.created_at">
              {{ formatRelativeTime(post.created_at) }}
            </span>
            <span class="sub-dot">•</span>
            <span
              v-if="post.external_source === 'xbox'"
              class="platform-source-badge xbox"
              title="Sincronizado via Xbox Live"
            >
              <span class="badge-dot xbox-dot"></span>
              Xbox Live
            </span>
            <span
              v-else
              class="platform-source-badge manual"
              title="Análise publicada na casa"
            >
              <span class="badge-dot"></span>
              Análise Gamer
            </span>
          </div>
        </div>
      </div>

      <div class="header-right">
        <button
          v-if="isAuthor"
          type="button"
          class="btn-delete-bracket"
          title="Excluir post"
          @click="showDeleteModal = true"
        >
          [ x ]
        </button>
      </div>
    </header>

    <!-- Main Content: Box Art & Game Info -->
    <div class="game-body-container">
      <!-- Box Art (Click to Zoom) -->
      <div
        v-if="game?.box_art_url"
        class="boxart-wrap"
        @click="openBoxArt(game.box_art_url)"
        title="Clique para ampliar a capa"
      >
        <img
          :src="game.box_art_url"
          :alt="game.game_title || 'Capa do jogo'"
          class="game-boxart"
          loading="lazy"
        />
        <span class="zoom-hint">🔍</span>
      </div>
      <div v-else class="boxart-placeholder" title="Sem capa disponível">
        <span class="placeholder-icon">🎮</span>
      </div>

      <!-- Game Details -->
      <div class="game-details">
        <div class="game-title-row">
          <h3 class="game-title">
            {{ game?.game_title || 'Jogo' }}
          </h3>
          <span v-if="game?.platform" class="platform-tag">
            {{ game.platform }}
          </span>
        </div>

        <!-- Status & Rating Row -->
        <div class="status-rating-row">
          <span class="game-status-badge" :class="statusLabel.class">
            {{ statusLabel.text }}
          </span>

          <div v-if="game?.rating" class="rating-box" :title="`Nota: ${game.rating} de 5`">
            <span class="stars">{{ renderRatingStars(game.rating) }}</span>
            <span class="rating-num">{{ game.rating }}</span>
          </div>
        </div>

        <!-- Gamerscore & Achievements (Xbox) -->
        <div v-if="game?.gamerscore != null || game?.achievements_count != null" class="achievements-card">
          <div class="achievements-stats-row">
            <span v-if="game.gamerscore != null" class="stat-pill gamerscore-pill">
              <strong class="stat-value">{{ game.gamerscore.toLocaleString() }}</strong>
              <span v-if="game.gamerscore_total">/ {{ game.gamerscore_total.toLocaleString() }}</span> G
            </span>

            <span v-if="game.achievements_count != null" class="stat-pill count-pill">
              🏆 <strong>{{ game.achievements_count }}</strong>
              <span v-if="game.achievements_total">/ {{ game.achievements_total }}</span> Conquistas
            </span>

            <span v-if="game.progress_percentage != null" class="stat-pill pct-pill">
              {{ game.progress_percentage }}%
            </span>
          </div>

          <!-- Progress Bar -->
          <div v-if="game.progress_percentage != null" class="retro-progress-track">
            <div
              class="retro-progress-fill"
              :class="{ 'is-mastered': (game.progress_percentage >= 100) }"
              :style="{ width: `${Math.min(100, Math.max(0, game.progress_percentage))}%` }"
            ></div>
          </div>
        </div>

        <!-- Hours played if specified -->
        <div v-if="game?.hours_played" class="hours-played-row">
          ⏱️ {{ game.hours_played }} horas registradas
        </div>

        <!-- Review Text if present -->
        <div v-if="post.content || game?.review_text" class="review-box">
          <p class="review-quote">
            <FormattedContent :content="post.content || game?.review_text || ''" />
          </p>
        </div>
      </div>
    </div>

    <!-- Actions Footer: Like, Comments toggle, Repost -->
    <footer class="card-footer">
      <div class="actions-left">
        <!-- Like Button -->
        <button
          type="button"
          class="action-btn like-btn"
          :class="{ active: isLiked }"
          @click="handleLikeToggle"
          title="Curtir"
        >
          <span class="action-icon">{{ isLiked ? '❤️' : '🤍' }}</span>
          <span class="action-label">{{ likesCount }}</span>
        </button>

        <!-- Comments Toggle Button -->
        <button
          type="button"
          class="action-btn comment-btn"
          :class="{ active: showComments }"
          @click="showComments = !showComments"
          title="Comentários"
        >
          <span class="action-icon">💬</span>
          <span class="action-label">{{ post.comments_count || 0 }}</span>
        </button>

        <!-- Repost Button -->
        <button
          type="button"
          class="action-btn repost-btn"
          @click="showRepostModal = true"
          title="Compartilhar no Feed Geral"
        >
          <span class="action-icon">🔁</span>
          <span class="action-label">Repost</span>
        </button>
      </div>
    </footer>

    <!-- Comments Section (Collapsible) -->
    <div v-if="showComments" class="comments-section">
      <!-- Input New Comment -->
      <div class="new-comment-box">
        <div v-if="replyingTo" class="reply-notice">
          <span>Respondendo a @{{ replyingTo.user.username }}</span>
          <button type="button" class="cancel-reply-btn" @click="cancelReply">✕</button>
        </div>
        <div class="comment-input-row">
          <MentionInput
            :id="`game-comment-input-${post.id}`"
            v-model="commentContent"
            placeholder="Deixe seu comentário sobre o jogo..."
            class="retro-textarea comment-field"
            :rows="2"
            @submit="handleAddComment"
          />
          <button
            type="button"
            class="retro-action-btn primary comment-send-btn"
            :disabled="!commentContent.trim() || isSubmittingComment"
            @click="handleAddComment"
          >
            {{ isSubmittingComment ? '...' : '[ Enviar ]' }}
          </button>
        </div>
      </div>

      <!-- Comments List -->
      <div v-if="commentsList.length" class="comments-stream">
        <div
          v-for="comment in commentsList"
          :key="comment.id"
          class="comment-item"
        >
          <div class="comment-avatar-col">
            <UserAvatar :user="comment.user" size="sm" />
          </div>
          <div class="comment-content-col">
            <div class="comment-header-line">
              <span class="comment-user">{{ comment.user.name }}</span>
              <span class="comment-handle">@{{ comment.user.username }}</span>
              <span class="comment-time">{{ formatRelativeTime(comment.created_at) }}</span>
            </div>

            <!-- Edit Mode -->
            <div v-if="editingCommentId === comment.id" class="comment-edit-box">
              <textarea v-model="editCommentText" class="retro-textarea edit-field" rows="2"></textarea>
              <div class="edit-btns-row">
                <button type="button" class="btn-save" @click="saveEditComment(comment)">[ Salvar ]</button>
                <button type="button" class="btn-cancel" @click="editingCommentId = null">Cancelar</button>
              </div>
            </div>
            <!-- Read Mode -->
            <div v-else class="comment-body-text">
              <FormattedContent :content="comment.content" />
            </div>

            <!-- Comment Actions -->
            <div class="comment-actions-line">
              <button
                type="button"
                class="comment-action-link"
                :class="{ active: comment.is_liked }"
                @click="handleToggleCommentLike(comment)"
              >
                {{ comment.is_liked ? '❤️' : '🤍' }} {{ comment.likes_count || '' }}
              </button>
              <button type="button" class="comment-action-link" @click="startReply(comment)">
                Responder
              </button>
              <button
                v-if="authStore.user?.id === comment.user.id"
                type="button"
                class="comment-action-link"
                @click="startEditComment(comment)"
              >
                Editar
              </button>
              <button
                v-if="authStore.user?.id === comment.user.id || authStore.isAdmin"
                type="button"
                class="comment-action-link delete"
                @click="confirmDeleteComment(comment.id)"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-comments">
        Nenhum comentário ainda. Seja o primeiro a comentar!
      </div>
    </div>

    <!-- Modais -->
    <RetroConfirmModal
      :model-value="showDeleteModal"
      title="Excluir Publicação de Jogo"
      message="Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita."
      confirm-text="[ Sim, Excluir ]"
      cancel-text="Cancelar"
      :is-danger="true"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <RepostModal
      v-model="showRepostModal"
      :post="post"
      @reposted="handleRepostSuccess"
    />
  </article>
</template>

<style scoped>
.game-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border-subtle, #f3f4f6);
}

.user-meta {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.user-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.user-name {
  font-weight: 700;
  color: var(--color-text, #111827);
  text-decoration: none;
  font-size: 0.95rem;
}

.user-name:hover {
  text-decoration: underline;
}

.user-handle {
  font-size: 0.8rem;
  color: var(--color-text-muted, #6b7280);
  font-family: var(--font-mono, monospace);
}

.user-sub-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
}

.sub-dot {
  font-size: 0.6rem;
  opacity: 0.6;
}

.platform-source-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.45rem;
  border-radius: 2px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
}

.platform-source-badge.xbox {
  background: #e8f5e9;
  color: #107c10;
  border: 1px solid #c8e6c9;
}

.platform-source-badge.manual {
  background: #f3e8ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.xbox-dot {
  background: #107c10;
}

.btn-delete-bracket {
  background: none;
  border: none;
  color: #dc2626;
  font-family: var(--font-mono, monospace);
  font-weight: bold;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 0.85rem;
}

.btn-delete-bracket:hover {
  background: #fee2e2;
  border-radius: 2px;
}

/* Body Container */
.game-body-container {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  align-items: flex-start;
}

@media (max-width: 600px) {
  .game-body-container {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .game-details {
    width: 100%;
    align-items: center;
  }
  .game-title-row {
    justify-content: center;
  }
  .status-rating-row {
    justify-content: center;
  }
}

.boxart-wrap {
  flex-shrink: 0;
  width: 120px;
  aspect-ratio: 3 / 4;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid var(--color-border, #d1d5db);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  position: relative;
  background: #1f2937;
}

.game-boxart {
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
  padding: 0.15rem 0.3rem;
  border-radius: 2px;
  font-size: 0.7rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.boxart-wrap:hover .zoom-hint {
  opacity: 1;
}

.boxart-placeholder {
  flex-shrink: 0;
  width: 120px;
  aspect-ratio: 3 / 4;
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
}

.game-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.game-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.game-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-text, #111827);
  letter-spacing: -0.01em;
}

.platform-tag {
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  font-family: var(--font-mono, monospace);
}

.status-rating-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.game-status-badge {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 3px;
  font-family: var(--font-mono, monospace);
}

.status-mastered {
  background: #fef08a;
  color: #854d0e;
  border: 1px solid #facc15;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.35);
}

.status-completed {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.status-playing {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.status-dropped {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.status-wishlist {
  background: #fdf2f8;
  color: #be185d;
  border: 1px solid #fbcfe8;
}

.rating-box {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
}

.stars {
  color: #f59e0b;
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.rating-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: #b45309;
}

/* Achievements Card */
.achievements-card {
  background: var(--color-surface-soft, #f9fafb);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.achievements-stats-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.stat-pill {
  font-size: 0.78rem;
  color: var(--color-text, #374151);
  font-family: var(--font-mono, monospace);
}

.gamerscore-pill strong {
  color: #107c10;
  font-weight: 800;
}

.retro-progress-track {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #d1d5db;
}

.retro-progress-fill {
  height: 100%;
  background: #107c10;
  transition: width 0.3s ease;
}

.retro-progress-fill.is-mastered {
  background: linear-gradient(90deg, #107c10, #eab308);
}

.hours-played-row {
  font-size: 0.8rem;
  color: var(--color-text-muted, #6b7280);
  font-family: var(--font-mono, monospace);
}

.review-box {
  margin-top: 0.4rem;
  border-left: 3px solid var(--color-primary, #a66130);
  padding-left: 0.75rem;
}

.review-quote {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text, #1f2937);
  line-height: 1.45;
  font-style: italic;
}

/* Footer Actions */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--color-border-subtle, #f3f4f6);
  background: var(--color-surface-soft, #f9fafb);
}

.actions-left {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  background: none;
  border: 1px solid transparent;
  padding: 0.25rem 0.55rem;
  border-radius: 3px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-text-muted, #4b5563);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: #e5e7eb;
  color: var(--color-text, #111827);
}

.action-btn.active {
  color: #dc2626;
}

.comment-btn.active {
  color: var(--color-primary, #a66130);
}

/* Comments Section */
.comments-section {
  padding: 0.85rem 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: #fdfdfd;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reply-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-primary, #a66130);
  margin-bottom: 0.3rem;
  background: #fff7ed;
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
}

.cancel-reply-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9a3412;
}

.comment-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.comment-field {
  flex: 1;
}

.comment-send-btn {
  white-space: nowrap;
  padding: 0.5rem 0.8rem;
}

.comments-stream {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.4rem;
}

.comment-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.comment-avatar-col {
  flex-shrink: 0;
}

.comment-content-col {
  flex: 1;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.comment-header-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  margin-bottom: 0.2rem;
}

.comment-user {
  font-weight: 700;
  color: var(--color-text, #111827);
}

.comment-handle,
.comment-time {
  color: var(--color-text-muted, #6b7280);
}

.comment-body-text {
  color: var(--color-text, #1f2937);
  line-height: 1.35;
}

.comment-actions-line {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.35rem;
  font-size: 0.72rem;
}

.comment-action-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text-muted, #6b7280);
  cursor: pointer;
}

.comment-action-link:hover {
  text-decoration: underline;
  color: var(--color-text, #111827);
}

.comment-action-link.delete {
  color: #ef4444;
}

.empty-comments {
  font-size: 0.8rem;
  color: var(--color-text-muted, #9ca3af);
  text-align: center;
  padding: 0.5rem 0;
}
</style>
