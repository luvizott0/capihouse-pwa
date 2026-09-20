<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { Post, PostComment } from '@/types/models'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
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

const props = defineProps<{
  post: Post
}>()

const emit = defineEmits<{
  (e: 'deleted', postId: number): void
  (e: 'reposted', newPost: any): void
}>()

const authStore = useAuthStore()
const feedStore = useFeedStore()
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

// -------------------------------------------------------------
// Comments Handling (identical to conventional feed post)
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
    if (!props.post.comments) props.post.comments = []
    props.post.comments.push(res.data)
    props.post.comments_count = (props.post.comments_count || 0) + 1

    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) {
      if (!postInUser.comments) postInUser.comments = []
      postInUser.comments.push(res.data)
      postInUser.comments_count = (postInUser.comments_count || 0) + 1
    }

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
    if (!props.post.comments) props.post.comments = []
    props.post.comments.push(res.data)
    props.post.comments_count = (props.post.comments_count || 0) + 1

    const postInUser = feedStore.userPosts.find((p) => p.id === props.post.id)
    if (postInUser && postInUser !== props.post) {
      if (!postInUser.comments) postInUser.comments = []
      postInUser.comments.push(res.data)
      postInUser.comments_count = (postInUser.comments_count || 0) + 1
    }

    commentContent.value = ''
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err)
  } finally {
    isSubmittingComment.value = false
  }
}
</script>

<template>
  <article class="letterboxd-card retro-box">
    <!-- Header: User info (3 lines) + Delete button on opposite side -->
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
            <span class="letterboxd-badge" title="Importado via Letterboxd">
              <span class="badge-dot"></span>
              Letterboxd
            </span>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- Delete button if author/admin: Red with brackets side by side -->
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

    <!-- Card Footer: Likes, Comments Toggle, Repost -->
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

        <!-- Comment Toggle Button -->
        <button
          type="button"
          class="action-btn comment-btn"
          :class="{ active: showComments }"
          @click="showComments = !showComments"
        >
          <span class="action-icon">💬</span>
          <span class="action-label">
            {{ post.comments_count || 0 }}
            {{ post.comments_count === 1 ? 'comentário' : 'comentários' }}
          </span>
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

    <!-- Delete Post Confirm Modal -->
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
  gap: 0.75rem;
}

.user-avatar-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  text-decoration: none;
}

.user-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.15rem;
  line-height: 1.2;
}

.user-name {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.92rem;
  line-height: 1.2;
  color: var(--color-primary-900, #3d2a14);
  text-decoration: none;
}
.user-name:hover {
  text-decoration: underline;
}

.user-handle {
  font-size: 0.78rem;
  line-height: 1.2;
  color: #718096;
  font-family: var(--font-mono, monospace);
}

.user-sub-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  line-height: 1.2;
  color: #718096;
}

.sub-dot {
  font-size: 0.7rem;
  color: #a0aec0;
}

.post-time {
  font-size: 0.74rem;
  color: #a0aec0;
}

.header-right {
  display: flex;
  align-items: center;
}

.letterboxd-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: #14181c;
  color: #00e054;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #ff8000;
}

.btn-delete-bracket {
  background: none;
  border: none;
  color: #e53e3e;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.btn-delete-bracket:hover {
  color: #c53030;
  background-color: #fff5f5;
  text-decoration: underline;
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
  gap: 0.6rem;
  flex-wrap: wrap;
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
  font-size: 0.82rem;
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

.comment-btn.active {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
  color: var(--color-primary, #a66130);
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

/* =============================================================
   Comments Section Styling (consistent with PostCard)
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
