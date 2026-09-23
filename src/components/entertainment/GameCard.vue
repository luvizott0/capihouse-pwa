<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

const displayReviewText = computed(() => {
  const text = props.post.content || game.value?.review_text || ''
  if (!text) return ''
  if (text.startsWith('🏆 100% Miletado!') || text.includes('100% Miletado! Conquistei todos os')) {
    return ''
  }
  return text
})

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

// -------------------------------------------------------------
// Comments Handling (identical to film / letterboxd posts)
// -------------------------------------------------------------
const commentContent = ref('')
const isSubmittingComment = ref(false)

interface ThreadedCommentItem {
  comment: PostComment
  depth: number
  rootId: number
  repliesCount?: number
}

const expandedThreadIds = ref<Set<number>>(new Set())

function toggleThread(rootCommentId: number) {
  const next = new Set(expandedThreadIds.value)
  if (next.has(rootCommentId)) {
    next.delete(rootCommentId)
  } else {
    next.add(rootCommentId)
  }
  expandedThreadIds.value = next
}

function isThreadExpanded(rootCommentId: number): boolean {
  return expandedThreadIds.value.has(rootCommentId)
}

function findRootId(commentId: number): number {
  const item = threadedComments.value.find((tc) => tc.comment.id === commentId)
  return item ? item.rootId : commentId
}

const threadedComments = computed<ThreadedCommentItem[]>(() => {
  const comments = props.post.comments
  if (!comments || !comments.length) return []

  const commentMap = new Map<number, PostComment>()
  const childrenMap = new Map<number, PostComment[]>()
  const rootComments: PostComment[] = []

  for (const c of comments) {
    commentMap.set(c.id, c)
  }

  for (const c of comments) {
    if (c.parent_id && commentMap.has(c.parent_id)) {
      const list = childrenMap.get(c.parent_id) || []
      list.push(c)
      childrenMap.set(c.parent_id, list)
    } else {
      rootComments.push(c)
    }
  }

  rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  for (const list of childrenMap.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  function countDescendants(commentId: number): number {
    const children = childrenMap.get(commentId)
    if (!children || !children.length) return 0
    let count = children.length
    for (const child of children) {
      count += countDescendants(child.id)
    }
    return count
  }

  const result: ThreadedCommentItem[] = []
  const visited = new Set<number>()

  function traverse(comment: PostComment, depth: number, rootId: number) {
    if (visited.has(comment.id)) return
    visited.add(comment.id)

    const item: ThreadedCommentItem = {
      comment,
      depth,
      rootId,
    }

    if (depth === 0) {
      item.repliesCount = countDescendants(comment.id)
    }

    result.push(item)

    const children = childrenMap.get(comment.id)
    if (children) {
      for (const child of children) {
        traverse(child, depth + 1, rootId)
      }
    }
  }

  for (const root of rootComments) {
    traverse(root, 0, root.id)
  }

  for (const c of comments) {
    if (!visited.has(c.id)) {
      result.push({ comment: c, depth: 0, rootId: c.id, repliesCount: 0 })
    }
  }

  return result
})

function canEditComment(comment: PostComment) {
  return authStore.user?.id === comment.user_id || authStore.isAdmin
}

function canDeleteComment(comment: PostComment) {
  return (
    authStore.user?.id === comment.user_id ||
    props.post.user_id === authStore.user?.id ||
    authStore.isAdmin
  )
}

const activeCommentMenuId = ref<number | null>(null)

function toggleCommentMenu(commentId: number) {
  if (activeCommentMenuId.value === commentId) {
    activeCommentMenuId.value = null
  } else {
    activeCommentMenuId.value = commentId
  }
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.comment-menu-wrapper')) {
    activeCommentMenuId.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// Inline comment editing
const editingCommentId = ref<number | null>(null)
const editingCommentContent = ref('')
const isUpdatingComment = ref(false)

function startEditComment(comment: PostComment) {
  activeCommentMenuId.value = null
  editingCommentId.value = comment.id
  editingCommentContent.value = comment.content
}

function cancelEditComment() {
  editingCommentId.value = null
  editingCommentContent.value = ''
}

async function saveEditComment(commentId: number) {
  if (!editingCommentContent.value.trim()) return
  isUpdatingComment.value = true
  try {
    const res = await updateComment(commentId, editingCommentContent.value.trim())
    const updateInList = (p: Post) => {
      if (p.comments) {
        const idx = p.comments.findIndex((c) => c.id === commentId)
        if (idx !== -1) p.comments[idx] = res.data
      }
    }
    updateInList(props.post)
    const postInEnt =
      entertainmentStore.posts.find((p) => p.id === props.post.id) ||
      entertainmentStore.gamePosts.find((p) => p.id === props.post.id)
    if (postInEnt && postInEnt !== props.post) updateInList(postInEnt)
    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) updateInList(postInUser)

    editingCommentId.value = null
    editingCommentContent.value = ''
  } catch (err) {
    console.error('Erro ao atualizar comentário:', err)
  } finally {
    isUpdatingComment.value = false
  }
}

// Comment deletion modal
const commentToDelete = ref<PostComment | null>(null)
const showDeleteCommentModal = ref(false)
const isDeletingComment = ref(false)

function promptDeleteComment(comment: PostComment) {
  activeCommentMenuId.value = null
  commentToDelete.value = comment
  showDeleteCommentModal.value = true
}

async function confirmDeleteComment() {
  if (!commentToDelete.value) return
  isDeletingComment.value = true
  try {
    const commentId = commentToDelete.value.id
    await deleteComment(commentId)
    const removeInList = (p: Post) => {
      if (p.comments) {
        p.comments = p.comments.filter((c) => c.id !== commentId)
        p.comments_count = Math.max(0, (p.comments_count || 0) - 1)
      }
    }
    removeInList(props.post)
    const postInEnt =
      entertainmentStore.posts.find((p) => p.id === props.post.id) ||
      entertainmentStore.gamePosts.find((p) => p.id === props.post.id)
    if (postInEnt && postInEnt !== props.post) removeInList(postInEnt)
    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) removeInList(postInUser)

    showDeleteCommentModal.value = false
    commentToDelete.value = null
  } catch (err) {
    console.error('Erro ao excluir comentário:', err)
  } finally {
    isDeletingComment.value = false
  }
}

// Inline comment reply
const replyingToCommentId = ref<number | null>(null)
const replyContent = ref('')
const isSubmittingReply = ref(false)

function startReply(comment: PostComment) {
  if (replyingToCommentId.value === comment.id) {
    cancelReply()
    return
  }
  replyingToCommentId.value = comment.id
  replyContent.value = ''
  showComments.value = true

  const rootId = findRootId(comment.id)
  if (rootId) {
    const next = new Set(expandedThreadIds.value)
    next.add(rootId)
    expandedThreadIds.value = next
  }

  nextTick(() => {
    const inputEl = document.querySelector(
      `#reply-box-${comment.id} input, #reply-box-${comment.id} textarea`
    ) as HTMLElement | null
    if (inputEl) {
      inputEl.focus()
    }
  })
}

function cancelReply() {
  replyingToCommentId.value = null
  replyContent.value = ''
}

async function submitReply(parentId: number) {
  if (!replyContent.value.trim()) return
  isSubmittingReply.value = true
  try {
    const res = await addComment(props.post.id, replyContent.value.trim(), parentId)
    const appendToList = (p: Post) => {
      if (!p.comments) p.comments = []
      const idx = p.comments.findIndex((c) => c.id === res.data.id)
      if (idx === -1) {
        p.comments.push(res.data)
        p.comments_count = (p.comments_count || 0) + 1
      }
    }
    appendToList(props.post)
    const postInEnt =
      entertainmentStore.posts.find((p) => p.id === props.post.id) ||
      entertainmentStore.gamePosts.find((p) => p.id === props.post.id)
    if (postInEnt && postInEnt !== props.post) appendToList(postInEnt)
    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) appendToList(postInUser)

    replyContent.value = ''
    replyingToCommentId.value = null

    const rootId = findRootId(parentId)
    if (rootId) {
      const next = new Set(expandedThreadIds.value)
      next.add(rootId)
      expandedThreadIds.value = next
    }
  } catch (err) {
    console.error('Erro ao responder comentário:', err)
  } finally {
    isSubmittingReply.value = false
  }
}

async function handleToggleCommentLike(comment: PostComment) {
  const prevLiked = !!comment.is_liked
  const prevCount = comment.likes_count ?? 0
  const nextLiked = !prevLiked
  const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1))

  comment.is_liked = nextLiked
  comment.likes_count = nextCount

  try {
    const res = await toggleCommentLike(comment.id)
    comment.is_liked = res.data.is_liked
    comment.likes_count = res.data.likes_count
  } catch {
    comment.is_liked = prevLiked
    comment.likes_count = prevCount
  }
}

async function handleAddComment() {
  if (!commentContent.value.trim()) return
  isSubmittingComment.value = true
  try {
    const res = await addComment(props.post.id, commentContent.value.trim(), null)
    const appendToList = (p: Post) => {
      if (!p.comments) p.comments = []
      const idx = p.comments.findIndex((c) => c.id === res.data.id)
      if (idx === -1) {
        p.comments.push(res.data)
        p.comments_count = (p.comments_count || 0) + 1
      }
    }
    appendToList(props.post)
    const postInEnt =
      entertainmentStore.posts.find((p) => p.id === props.post.id) ||
      entertainmentStore.gamePosts.find((p) => p.id === props.post.id)
    if (postInEnt && postInEnt !== props.post) appendToList(postInEnt)
    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) appendToList(postInUser)

    commentContent.value = ''
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err)
  } finally {
    isSubmittingComment.value = false
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
              Análise
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
        <div v-if="displayReviewText" class="review-box">
          <p class="review-quote">
            <FormattedContent :content="displayReviewText" />
          </p>
        </div>
      </div>
    </div>

    <!-- Action Bar: Likes, Comments, Repost -->
    <div class="post-actions">
      <!-- Like Button -->
      <button
        type="button"
        class="action-btn like-btn"
        :class="{ liked: isLiked }"
        @click="handleLikeToggle"
      >
        <span class="icon">{{ isLiked ? '❤️' : '🤍' }}</span>
        <span>{{ likesCount }} {{ likesCount === 1 ? 'curtida' : 'curtidas' }}</span>
      </button>

      <!-- Comment Toggle Button -->
      <button
        type="button"
        class="action-btn comment-btn"
        @click="showComments = !showComments"
      >
        <span class="icon">💬</span>
        <span>
          {{ post.comments_count || 0 }}
          {{ post.comments_count === 1 ? 'comentário' : 'comentários' }}
        </span>
      </button>

      <!-- Repost Button (Only visible for the author) -->
      <button
        v-if="isAuthor"
        type="button"
        class="action-btn repost-btn"
        title="Compartilhar este jogo no feed principal"
        @click="showRepostModal = true"
      >
        <span class="icon">🔁</span>
        <span>Repostar no Feed</span>
      </button>
    </div>

    <!-- Comments Section (Collapsible) -->
    <div v-if="showComments" class="comments-section">
      <!-- Add Comment Input Form (Top of comments section) -->
      <form @submit.prevent="handleAddComment" class="comment-form-container">
        <div class="comment-form-row">
          <MentionInput
            v-model="commentContent"
            type="input"
            placeholder="Escreva um comentário... (use @ para marcar)"
            inputClass="comment-input"
            :maxlength="500"
            popupPosition="top"
            @submit="handleAddComment"
          />
          <button
            type="submit"
            class="comment-submit-btn"
            :disabled="isSubmittingComment || !commentContent.trim()"
          >
            {{ isSubmittingComment ? '[ ... ]' : '[ Comentar ]' }}
          </button>
        </div>
      </form>

      <!-- Comments List -->
      <div v-if="threadedComments.length" class="comments-list">
        <template
          v-for="item in threadedComments"
          :key="item.comment.id"
        >
          <!-- Comment Item (shown if root or if thread is expanded) -->
          <div
            v-if="item.depth === 0 || isThreadExpanded(item.rootId)"
            :id="'comment-' + item.comment.id"
            class="comment-item"
            :class="{
              'is-reply': item.depth > 0,
              'is-deep-reply': item.depth > 1,
            }"
          >
            <router-link :to="`/profile/${item.comment.user?.username}`" class="comment-avatar-link">
              <UserAvatar :user="item.comment.user" size="sm" />
            </router-link>
            <div class="comment-content-box">
              <!-- Parent comment quotation header if this comment is a reply -->
              <div v-if="item.comment.parent" class="comment-reply-context">
                <span class="reply-symbol">↳</span>
                <span class="reply-to-text">Em resposta a</span>
                <router-link
                  v-if="item.comment.parent.user?.username"
                  :to="`/profile/${item.comment.parent.user.username}`"
                  class="reply-user-link"
                >
                  @{{ item.comment.parent.user.username }}
                </router-link>
                <span class="reply-quote-preview">
                  "{{ item.comment.parent.content.length > 50 ? item.comment.parent.content.substring(0, 50) + '...' : item.comment.parent.content }}"
                </span>
              </div>

              <div class="comment-user-line">
                <router-link :to="`/profile/${item.comment.user?.username}`" class="comment-user-name">
                  {{ item.comment.user?.name }}
                </router-link>
                <div class="comment-header-right">
                  <span class="comment-date">
                    {{ formatRelativeTime(item.comment.created_at) }}
                    <span v-if="item.comment.updated_at && item.comment.updated_at !== item.comment.created_at" class="comment-edited-tag">(editado)</span>
                  </span>
                  <div
                    v-if="editingCommentId !== item.comment.id && (canEditComment(item.comment) || canDeleteComment(item.comment))"
                    class="comment-menu-wrapper"
                  >
                    <button
                      type="button"
                      class="comment-menu-trigger"
                      title="Mais opções"
                      aria-label="Mais opções"
                      @click.stop="toggleCommentMenu(item.comment.id)"
                    >
                      ⋮
                    </button>
                    <div
                      v-if="activeCommentMenuId === item.comment.id"
                      class="comment-dropdown-menu"
                      @click.stop
                    >
                      <button
                        v-if="canEditComment(item.comment)"
                        type="button"
                        class="comment-menu-item edit-item"
                        @click="startEditComment(item.comment)"
                      >
                        <span class="item-icon">✎</span> Editar
                      </button>
                      <button
                        v-if="canDeleteComment(item.comment)"
                        type="button"
                        class="comment-menu-item delete-item"
                        @click="promptDeleteComment(item.comment)"
                      >
                        <span class="item-icon">×</span> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Inline Edit Mode -->
              <div v-if="editingCommentId === item.comment.id" class="comment-inline-edit">
                <MentionInput
                  v-model="editingCommentContent"
                  type="input"
                  :maxlength="500"
                  :disabled="isUpdatingComment"
                  inputClass="comment-edit-input"
                  popupPosition="top"
                  @submit="saveEditComment(item.comment.id)"
                  @cancel="cancelEditComment"
                />
                <div class="comment-inline-edit-actions">
                  <button
                    type="button"
                    class="comment-save-btn"
                    :disabled="isUpdatingComment || !editingCommentContent.trim()"
                    @click="saveEditComment(item.comment.id)"
                  >
                    {{ isUpdatingComment ? '[ Salvando... ]' : '[ Salvar ]' }}
                  </button>
                  <button
                    type="button"
                    class="comment-cancel-btn"
                    :disabled="isUpdatingComment"
                    @click="cancelEditComment"
                  >
                    [ Cancelar ]
                  </button>
                </div>
              </div>

              <!-- Standard Comment Text & Footer -->
              <template v-else>
                <p class="comment-text">
                  <FormattedContent :content="item.comment.content" />
                </p>

                <!-- Comment Footer: Like & Reply -->
                <div class="comment-footer">
                  <button
                    type="button"
                    class="comment-like-btn"
                    :class="{ liked: item.comment.is_liked }"
                    :title="item.comment.is_liked ? 'Descurtir comentário' : 'Curtir comentário'"
                    @click="handleToggleCommentLike(item.comment)"
                  >
                    <span class="like-heart-icon">{{ item.comment.is_liked ? '❤️' : '🤍' }}</span>
                    <span class="comment-like-count">{{ item.comment.likes_count || 0 }}</span>
                  </button>

                  <button
                    type="button"
                    class="comment-reply-btn"
                    :class="{ active: replyingToCommentId === item.comment.id }"
                    title="Responder a este comentário"
                    @click="startReply(item.comment)"
                  >
                    <span class="reply-arrow-icon">↩</span> Responder
                  </button>
                </div>

                <!-- Inline Reply Form under the comment -->
                <div
                  v-if="replyingToCommentId === item.comment.id"
                  :id="'reply-box-' + item.comment.id"
                  class="comment-inline-reply"
                >
                  <div class="inline-reply-header">
                    <span class="inline-reply-label">
                      ↳ Respondendo a <strong>@{{ item.comment.user?.username || item.comment.user?.name }}</strong>:
                    </span>
                    <button
                      type="button"
                      class="inline-reply-cancel-btn"
                      title="Cancelar resposta"
                      @click="cancelReply"
                    >
                      [ × Cancelar ]
                    </button>
                  </div>
                  <div class="inline-reply-row">
                    <MentionInput
                      v-model="replyContent"
                      type="input"
                      :placeholder="`Responder a @${item.comment.user?.username || item.comment.user?.name}...`"
                      inputClass="inline-reply-input"
                      :maxlength="500"
                      popupPosition="top"
                      @submit="submitReply(item.comment.id)"
                      @cancel="cancelReply"
                    />
                    <button
                      type="button"
                      class="inline-reply-submit-btn"
                      :disabled="isSubmittingReply || !replyContent.trim()"
                      @click="submitReply(item.comment.id)"
                    >
                      {{ isSubmittingReply ? '[ ... ]' : '[ Responder ]' }}
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Thread replies toggle button right below root comment -->
          <div
            v-if="item.depth === 0 && item.repliesCount && item.repliesCount > 0"
            class="thread-toggle-wrapper"
          >
            <button
              type="button"
              class="toggle-replies-btn"
              @click="toggleThread(item.comment.id)"
            >
              <span class="toggle-icon">{{ isThreadExpanded(item.comment.id) ? '▾' : '▸' }}</span>
              <span>
                {{
                  isThreadExpanded(item.comment.id)
                    ? 'Ocultar respostas'
                    : item.repliesCount === 1
                      ? 'Ver 1 resposta'
                      : `Ver ${item.repliesCount} respostas`
                }}
              </span>
            </button>
          </div>
        </template>
      </div>
      <div v-else class="no-comments">
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
      :is-loading="isDeleting"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Delete Comment Confirm Modal -->
    <RetroConfirmModal
      v-model="showDeleteCommentModal"
      title="Excluir Comentário"
      message="Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita."
      confirm-text="Excluir"
      cancel-text="Cancelar"
      :is-danger="true"
      :is-loading="isDeletingComment"
      @confirm="confirmDeleteComment"
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

/* Action Bar / Post Actions (identical to LetterboxdCard) */
.post-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.85rem;
  border-top: 1px solid var(--color-border, #D8CDC5);
  background-color: var(--color-primary-50, #f8f6f1);
  border-radius: 2px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
  transition: color 0.15s ease;
}

.action-btn:hover {
  color: var(--color-primary, #a66130);
}

.action-btn .icon {
  font-size: 0.95rem;
  line-height: 1;
}

.like-btn.liked {
  color: #dc2626;
}

.repost-btn:hover {
  color: var(--color-primary, #a66130);
}

/* =============================================================
   Comments Section Styling (consistent with LetterboxdCard)
   ============================================================= */
.comments-section {
  background-color: var(--color-primary-50, #fdf8f3);
  border-top: 1px solid var(--color-border, #d8cdc5);
  padding: 0.85rem;
  border-radius: 0 0 2px 2px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.comment-form-container {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.comment-form-row {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
}

.comment-form-row :deep(.mention-input-wrapper) {
  flex: 1 1 0;
  min-width: 0;
  width: auto;
}

.comment-input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  border: 1px solid var(--color-border, #d8cdc5);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.comment-input:focus {
  border-color: var(--color-primary, #a66130);
}

.comment-submit-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: none;
  border-radius: 2px;
  padding: 0 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.comment-submit-btn:hover:not(:disabled) {
  background-color: var(--color-primary-800, #5f4120);
}
.comment-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.comment-item.is-reply {
  margin-left: 2rem;
}

.comment-item.is-deep-reply {
  margin-left: 3.25rem;
}

.comment-avatar-link {
  flex-shrink: 0;
  display: flex;
  text-decoration: none;
}

.comment-content-box {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
  min-width: 0;
}

.comment-reply-context {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  color: #718096;
  border-bottom: 1px dashed var(--color-border, #d8cdc5);
  padding-bottom: 0.25rem;
}

.reply-symbol {
  font-weight: bold;
  color: var(--color-primary, #a66130);
}

.reply-to-text {
  font-family: var(--font-body, 'Outfit', sans-serif);
}

.reply-user-link {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  text-decoration: none;
}
.reply-user-link:hover {
  text-decoration: underline;
}

.reply-quote-preview {
  font-style: italic;
  color: #847062;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-user-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
  gap: 0.5rem;
}

.comment-user-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  text-decoration: none;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comment-user-name:hover {
  text-decoration: underline;
}

.comment-header-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  margin-left: auto;
}

.comment-date {
  font-size: 0.7rem;
  color: #847062;
  white-space: nowrap;
}

.comment-edited-tag {
  font-size: 0.65rem;
  color: #847062;
  font-style: italic;
  margin-left: 0.15rem;
}

.comment-menu-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.comment-menu-trigger {
  background: none;
  border: 1px solid transparent;
  font-size: 1rem;
  font-weight: bold;
  line-height: 1;
  color: #847062;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  transition: all 0.15s ease;
}
.comment-menu-trigger:hover {
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border, #d8cdc5);
}

.comment-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 2px);
  background: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.14);
  border-radius: 2px;
  z-index: 30;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  padding: 0.2rem 0;
}

.comment-menu-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: bold;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s ease;
}
.comment-menu-item .item-icon {
  font-size: 0.8rem;
  line-height: 1;
}

.comment-menu-item.edit-item {
  color: var(--color-primary-800, #7d5628);
}
.comment-menu-item.edit-item:hover {
  background-color: var(--color-primary-50, #fdf8f3);
}

.comment-menu-item.delete-item {
  color: #ef4444;
}
.comment-menu-item.delete-item:hover {
  background-color: #fee2e2;
}

.comment-inline-edit {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.comment-edit-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  border: 1px solid var(--color-primary, #a66130);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}

.comment-inline-edit-actions {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
}

.comment-save-btn {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: none;
  border-radius: 2px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
}
.comment-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-cancel-btn {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background: none;
  border: 1px solid var(--color-border, #d8cdc5);
  color: #847062;
  border-radius: 2px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
}
.comment-cancel-btn:hover {
  background-color: var(--color-primary-50, #f8f6f1);
}

.comment-text {
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.85rem;
  line-height: 1.4;
  color: #333333;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.45rem;
  padding-top: 0.35rem;
  border-top: 1px dotted var(--color-border, #e5ddd5);
}

.comment-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 0.15rem 0.35rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  color: #847062;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}
.comment-like-btn:hover {
  border-color: var(--color-border, #d8cdc5);
  background: var(--color-primary-50, #fdf8f3);
}
.comment-like-btn.liked {
  color: #dc2626;
  font-weight: 700;
}
.comment-like-btn.liked:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.like-heart-icon {
  font-size: 0.75rem;
}

.comment-like-count {
  font-weight: bold;
}

.comment-reply-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 0.15rem 0.35rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-primary-700, #7d5628);
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}
.comment-reply-btn:hover {
  border-color: var(--color-border, #d8cdc5);
  background: var(--color-primary-50, #fdf8f3);
  color: var(--color-primary, #a66130);
}
.comment-reply-btn.active {
  background: var(--color-primary-100, #f6eee4);
  border-color: var(--color-primary-300, #d5bba2);
  color: var(--color-primary, #a66130);
}

.reply-arrow-icon {
  font-size: 0.72rem;
}

.comment-inline-reply {
  margin-top: 0.45rem;
  padding: 0.45rem 0.6rem;
  background: var(--color-primary-50, #fdf8f3);
  border: 1px solid var(--color-primary-200, #d5bba2);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.inline-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.inline-reply-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  color: var(--color-primary-900, #463018);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inline-reply-label strong {
  color: var(--color-primary-800, #5f4120);
}

.inline-reply-cancel-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.7rem;
  font-weight: 700;
  color: #dc2626;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.inline-reply-cancel-btn:hover {
  background-color: #fee2e2;
}

.inline-reply-row {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  width: 100%;
}

.inline-reply-row :deep(.mention-input-wrapper) {
  flex: 1 1 0;
  min-width: 0;
  width: auto;
}

.inline-reply-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  font-size: 0.82rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  border: 1px solid var(--color-border, #d8cdc5);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.inline-reply-input:focus {
  border-color: var(--color-primary, #a66130);
}

.inline-reply-submit-btn {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: none;
  border-radius: 2px;
  padding: 0 0.65rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
}
.inline-reply-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thread-toggle-wrapper {
  margin-left: 2rem;
  margin-top: 0.2rem;
}

.toggle-replies-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 2px;
  transition: all 0.15s ease;
}
.toggle-replies-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  text-decoration: underline;
}

.toggle-icon {
  font-size: 0.8rem;
  line-height: 1;
}

.no-comments {
  font-size: 0.8rem;
  color: #847062;
  text-align: center;
  padding: 0.75rem 0.5rem;
}
</style>
