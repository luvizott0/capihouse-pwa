<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { Post, PostComment } from '@/types/models'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import { useImageViewerStore } from '@/stores/imageViewer'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import PostEditModal from './PostEditModal.vue'
import RecapCardModal from './RecapCardModal.vue'
import RecapFeedCard from './RecapFeedCard.vue'
import FormattedContent from '@/components/ui/FormattedContent.vue'
import MentionInput from '@/components/ui/MentionInput.vue'
import PollCard from './PollCard.vue'
import { formatRelativeTime } from '@/utils/date'
import { resolveMediaUrl } from '@/utils/media'
import RepostModal from '@/components/entertainment/RepostModal.vue'
import { pinPost } from '@/api/posts'

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
  (e: 'pinned', payload: { postId: number; pinned: boolean }): void
}>()

const router = useRouter()
const feedStore = useFeedStore()
const authStore = useAuthStore()
const imageViewer = useImageViewerStore()

const showComments = ref(props.defaultShowComments)
const commentContent = ref('')
const isSubmittingComment = ref(false)
const showEditModal = ref(false)
const showRecapModal = ref(false)
const showRepostModal = ref(false)
const isPinning = ref(false)

const isAuthor = computed(() => Boolean((authStore.user?.id && authStore.user.id === props.post.user_id) || authStore.isAdmin))

const isPostOwner = computed(() => Boolean(authStore.user?.id && authStore.user.id === props.post.user_id))

const isPinned = computed(() => authStore.user?.pinned_post_id === props.post.id)

async function handleTogglePin() {
  if (isPinning.value) return
  isPinning.value = true
  showPostMenu.value = false
  try {
    const res = await pinPost(props.post.id)
    authStore.updatePinnedPost(res.data.pinned_post_id, res.data.pinned ? props.post : null)
    emit('pinned', { postId: props.post.id, pinned: res.data.pinned })
  } catch (err: any) {
    console.error('Erro ao fixar publicação:', err)
  } finally {
    isPinning.value = false
  }
}

function handleRepostCreated(newPost: any) {
  showRepostModal.value = false
  emit('reposted', newPost)
  if (feedStore.posts && Array.isArray(feedStore.posts)) {
    feedStore.posts.unshift(newPost)
  }
}

const isMusicPost = computed(() => {
  return props.post.entertainment_type === 'music' || props.post.external_source === 'spotify' || !!props.post.metadata?.track_title
})

const isMoviePost = computed(() => {
  return (
    props.post.entertainment_type === 'movie' ||
    props.post.external_source === 'letterboxd' ||
    (!props.post.entertainment_type && !!props.post.metadata?.film_title)
  )
})

const isSeriesPost = computed(() => {
  return (
    props.post.entertainment_type === 'series' ||
    props.post.external_source === 'capyshowtime' ||
    (!props.post.entertainment_type && !!props.post.metadata?.series_name)
  )
})

const isGamePost = computed(() => {
  return (
    props.post.entertainment_type === 'game' ||
    props.post.external_source === 'xbox' ||
    (!props.post.entertainment_type && !!props.post.metadata?.game_title)
  )
})

const isAnyEntertainmentPost = computed(() => {
  return isMoviePost.value || isSeriesPost.value || isGamePost.value || isMusicPost.value
})

const gameStatusLabel = computed(() => {
  const s = props.post.metadata?.game_status
  if (s === 'mastered' || (props.post.metadata?.progress_percentage ?? 0) >= 100) {
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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    // Extrai a parte da data caso seja formato YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, ou YYYY-MM-DD HH:mm:ss
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d)
    }
    return dateStr
  } catch {
    return dateStr || ''
  }
}

function formatEpCode(season?: number, ep?: number): string {
  if (season == null || ep == null) return ''
  const s = String(season).padStart(2, '0')
  const e = String(ep).padStart(2, '0')
  return `S${s}E${e}`
}

function resolveSeriesPoster(poster?: string | null): string | null {
  if (!poster) return null
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster
  return `https://image.tmdb.org/t/p/w500${poster}`
}

function openSeriesInCapyShowTime() {
  const tmdbId = props.post.metadata?.tmdb_id
  if (tmdbId) {
    window.open(`https://bmo.tailf56388.ts.net:8443/series/${tmdbId}`, '_blank')
  } else {
    window.open('https://bmo.tailf56388.ts.net:8443', '_blank')
  }
}

const seriesWatchedDate = computed(() => {
  return (
    props.post.watched_at ||
    props.post.metadata?.watched_date ||
    props.post.created_at
  )
})

const seriesCommentText = computed(() => {
  if (!props.post.content) return ''
  const content = props.post.content.trim()

  // Se for o texto gerado automaticamente: Comentou no episódio S01E03 (...) de Série: "Comentário"
  const commentMatch = content.match(/Comentou no epis[oó]dio [^:]+:\s*["“]([\s\S]+?)["”]$/i)
  if (commentMatch && commentMatch[1]) {
    return commentMatch[1].trim()
  }

  // Se for notificação gerada pelo sistema (avaliação, conclusão ou marcação de episódio)
  if (
    /^Assistiu e avaliou o epis[oó]dio/i.test(content) ||
    /^Assistiu o epis[oó]dio/i.test(content) ||
    /^Concluiu a s[eé]rie/i.test(content)
  ) {
    return ''
  }

  return content
})

function openMediaPreview(url?: string | null, title?: string | null, sub?: string | null) {
  if (url) {
    imageViewer.openImage(url, title || 'Imagem', sub || undefined)
  }
}

const isEntertainmentRepost = computed(() => {
  const rp = props.post.reposted_post
  if (!rp) return false
  return rp.category === 'entertainment' || !!rp.entertainment_type || !!rp.metadata?.film_title || !!rp.metadata?.game_title || !!rp.metadata?.track_title
})

function openRepostedMediaModal(mediaList: any[], clickedIndex: number) {
  const author = props.post.reposted_post?.user?.username
    ? `@${props.post.reposted_post.user.username}`
    : ''
  const imageItems = mediaList
    .filter(m => m.type !== 'video')
    .map(m => ({
      url: resolveMediaUrl(m.url || m.path),
      title: author,
    }))
  if (!imageItems.length) return
  imageViewer.openGallery(imageItems, Math.max(0, clickedIndex))
}

function handleRepostBoxClick(e: MouseEvent | KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target?.closest('a, button, .embedded-poster, .embedded-media-thumb')) {
    return
  }
  if (props.post.reposted_post?.id) {
    router.push({ name: 'post-detail', params: { id: props.post.reposted_post.id } })
  }
}

const isRecapPost = computed(() => {
  return (
    props.post.user?.username === 'capivara.rogeria' &&
    (props.post.content?.includes('#RecapRogeria') ||
      props.post.hashtags?.some((h) => h.name.toLowerCase() === 'recaprogeria'))
  )
})

const isBirthdayPost = computed(() => {
  return (
    props.post.user?.username === 'capivara.rogeria' &&
    (props.post.content?.includes('#AniversarioCapiHouse') ||
      props.post.hashtags?.some((h) => h.name.toLowerCase() === 'aniversariocapihouse'))
  )
})

function renderRatingStars(rating?: number | null): string {
  if (rating == null) return ''
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? '½' : ''
  return '★'.repeat(full) + half
}

function openPoster(url?: string | null) {
  if (url) {
    imageViewer.openImage(
      url,
      props.post.reposted_post?.metadata?.film_title || 'Pôster',
      props.post.reposted_post?.metadata?.film_year ? String(props.post.reposted_post.metadata.film_year) : undefined
    )
  }
}

// Comment permissions
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

// Comment options menu (3-dots)
const activeCommentMenuId = ref<number | null>(null)

function toggleCommentMenu(commentId: number) {
  if (activeCommentMenuId.value === commentId) {
    activeCommentMenuId.value = null
  } else {
    activeCommentMenuId.value = commentId
  }
}

// Post options menu (3-dots)
const showPostMenu = ref(false)

function togglePostMenu() {
  showPostMenu.value = !showPostMenu.value
}

function handleEditPost() {
  showPostMenu.value = false
  showEditModal.value = true
}

function handleDeletePost() {
  showPostMenu.value = false
  showDeleteModal.value = true
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.comment-menu-wrapper')) {
    activeCommentMenuId.value = null
  }
  if (target && !target.closest('.post-menu-wrapper')) {
    showPostMenu.value = false
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
    await feedStore.updateComment(props.post.id, commentId, editingCommentContent.value.trim())
    editingCommentId.value = null
    editingCommentContent.value = ''
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
    await feedStore.deleteComment(props.post.id, commentToDelete.value.id)
    showDeleteCommentModal.value = false
    commentToDelete.value = null
  } finally {
    isDeletingComment.value = false
  }
}

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

function openMediaModal(clickedIndex: number) {
  if (!props.post.media || !props.post.media.length) return

  const authorUsername = props.post.user?.username
    ? `@${props.post.user.username}`
    : (props.post.user?.name || '')

  const imageItems = props.post.media
    .filter(m => m.type !== 'video')
    .map(m => ({
      url: resolveMediaUrl(m.url || m.path),
      title: authorUsername,
    }))

  if (!imageItems.length) return

  const clickedMedia = props.post.media[clickedIndex]
  if (!clickedMedia || clickedMedia.type === 'video') return

  const targetUrl = resolveMediaUrl(clickedMedia.url || clickedMedia.path)
  const targetIndex = imageItems.findIndex(item => item.url === targetUrl)

  imageViewer.openGallery(imageItems, Math.max(0, targetIndex))
}

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
  const item = threadedComments.value.find(tc => tc.comment.id === commentId)
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

  // Sort root comments chronologically (oldest first)
  rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Sort child comments chronologically (oldest first)
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

  // Fallback in case of cycle or orphaned reference
  for (const c of comments) {
    if (!visited.has(c.id)) {
      result.push({ comment: c, depth: 0, rootId: c.id, repliesCount: 0 })
    }
  }

  return result
})

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

  // Auto-expand thread so user sees the conversation context
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
    await feedStore.addComment(props.post.id, replyContent.value.trim(), parentId)
    replyContent.value = ''
    replyingToCommentId.value = null

    // Ensure thread is expanded so new reply is visible
    const rootId = findRootId(parentId)
    if (rootId) {
      const next = new Set(expandedThreadIds.value)
      next.add(rootId)
      expandedThreadIds.value = next
    }
  } finally {
    isSubmittingReply.value = false
  }
}

async function handleToggleCommentLike(comment: PostComment) {
  await feedStore.toggleCommentLike(props.post.id, comment.id)
}

async function handleLike() {
  await feedStore.toggleLike(props.post.id)
}

async function handleAddComment() {
  if (!commentContent.value.trim()) return
  isSubmittingComment.value = true
  try {
    await feedStore.addComment(props.post.id, commentContent.value.trim(), null)
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
    emit('deleted', props.post.id)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div :id="'post-' + post.id" class="retro-post-card">
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
            <span v-if="isRecapPost" class="recap-badge" title="Recap Mensal de Sentimentos da Rogéria">
              🐾 Recap Mensal
            </span>
            <span v-if="isBirthdayPost" class="birthday-badge" title="Parabéns da Capivara Rogéria">
              🎂 Aniversário
            </span>
            <span v-if="post.repost_of_id" class="repost-badge" title="Repost">
              🔁 Repost
            </span>
            <span v-if="isMoviePost" class="media-type-badge movie-badge" title="Cinema e Filmes">
              🍿 Letterboxd
            </span>
            <span v-if="isSeriesPost" class="media-type-badge series-badge" title="Séries no CapyShowTime">
              📺 CapyShowTime
            </span>
            <span v-if="isGamePost" class="media-type-badge game-badge" :class="{ 'xbox-badge': post.external_source === 'xbox' }" title="Jogos">
              {{ post.external_source === 'xbox' ? '🎮 Xbox Live' : '🕹️ Análise de Jogo' }}
            </span>
            <span v-if="isMusicPost" class="media-type-badge spotify-badge" title="Música no Spotify">
              🎵 Spotify
            </span>
            <span v-if="isPinned" class="pinned-badge" title="Publicação fixada no perfil">
              📌 Fixado
            </span>
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
            <span v-if="post.mentions && post.mentions.length" class="mentions-indicator">
              • com <template v-for="(m, mi) in post.mentions" :key="m.id"><router-link :to="`/profile/${m.username}`" class="post-mention-tag">@{{ m.username }}</router-link><span v-if="mi < post.mentions.length - 1">, </span></template>
            </span>
          </div>
        </div>
      </div>

      <!-- Action options for author/admin (3-dots menu) -->
      <div v-if="isAuthor" class="post-menu-wrapper">
        <button
          type="button"
          class="post-menu-trigger"
          title="Mais opções"
          aria-label="Mais opções"
          @click.stop="togglePostMenu"
        >
          ⋮
        </button>
        <div
          v-if="showPostMenu"
          class="post-dropdown-menu"
          @click.stop
        >
          <button
            v-if="isPostOwner"
            type="button"
            class="post-menu-item pin-item"
            :disabled="isPinning"
            @click="handleTogglePin"
          >
            <span class="item-icon">📌</span> {{ isPinned ? 'Desafixar do perfil' : 'Fixar no perfil' }}
          </button>
          <button
            type="button"
            class="post-menu-item edit-item"
            @click="handleEditPost"
          >
            <span class="item-icon">✎</span> Editar
          </button>
          <button
            type="button"
            class="post-menu-item delete-item"
            @click="handleDeletePost"
          >
            <span class="item-icon">×</span> Excluir
          </button>
        </div>
      </div>
    </div>

    <!-- Post Content: Card Visual se for Recap, ou texto formatado padrão para posts regulares -->
    <div v-if="post.content && !isMoviePost && !isSeriesPost && !isGamePost" class="post-body" :class="{ 'recap-body': isRecapPost }">
      <RecapFeedCard v-if="isRecapPost" :post="post" />
      <FormattedContent v-else :content="post.content" />
    </div>

    <!-- Movie Subcard (Filme / Letterboxd) -->
    <div v-if="isMoviePost && (post.metadata?.film_title || post.content)" class="post-entertainment-subcard movie-subcard">
      <div
        v-if="post.metadata?.poster_url"
        class="ent-media-stage poster-stage"
        @click="openMediaPreview(post.metadata.poster_url, post.metadata.film_title, post.metadata.film_year ? String(post.metadata.film_year) : undefined)"
        title="Clique para ampliar o pôster"
      >
        <img
          :src="post.metadata.poster_url"
          :alt="post.metadata.film_title || 'Pôster do filme'"
          class="ent-media-thumb movie-poster-thumb"
          loading="lazy"
        />
        <span class="zoom-pill">🔍</span>
      </div>
      <div class="ent-media-content">
        <div class="ent-title-row">
          <h3 class="ent-main-title">
            {{ post.metadata?.film_title || 'Filme' }}
          </h3>
          <span v-if="post.metadata?.film_year" class="ent-year-tag">
            ({{ post.metadata.film_year }})
          </span>
        </div>

        <div class="ent-meta-row">
          <div v-if="post.metadata?.rating" class="ent-rating-box" :title="`Nota: ${post.metadata.rating} de 5`">
            <span class="stars">{{ renderRatingStars(post.metadata.rating) }}</span>
            <span class="rating-num">{{ post.metadata.rating }}</span>
          </div>
          <span v-else class="no-rating-pill">Sem nota</span>

          <span v-if="post.metadata?.rewatch" class="rewatch-pill" title="Filme reassistido">
            🔁 Reassistido
          </span>

          <span v-if="post.metadata?.watched_date" class="watched-date-pill">
            📅 {{ formatDate(post.metadata.watched_date) }}
          </span>
        </div>

        <div v-if="post.content" class="ent-review-text">
          <FormattedContent :content="post.content" />
        </div>

        <div v-if="post.metadata?.letterboxd_url" class="ent-footer-link-row">
          <a
            :href="post.metadata.letterboxd_url"
            target="_blank"
            rel="noopener noreferrer"
            class="ent-external-link letterboxd-link"
          >
            [ Ver no Letterboxd ↗ ]
          </a>
        </div>
      </div>
    </div>

    <!-- Series Subcard (Série / CapyShowTime) -->
    <div v-if="isSeriesPost && (post.metadata?.series_name || post.content)" class="post-entertainment-subcard series-subcard">
      <div
        v-if="resolveSeriesPoster(post.metadata?.poster_url)"
        class="ent-media-stage poster-stage"
        @click="openMediaPreview(resolveSeriesPoster(post.metadata?.poster_url), post.metadata?.series_name)"
        title="Clique para ampliar o pôster"
      >
        <img
          :src="resolveSeriesPoster(post.metadata?.poster_url)!"
          :alt="post.metadata?.series_name || 'Pôster da série'"
          class="ent-media-thumb series-poster-thumb"
          loading="lazy"
        />
        <span class="zoom-pill">🔍</span>
      </div>
      <div class="ent-media-content">
        <div class="ent-title-row">
          <h3 class="ent-main-title">
            {{ post.metadata?.series_name || 'Série' }}
          </h3>
        </div>

        <div class="ent-meta-row">
          <div v-if="post.metadata?.rating" class="ent-rating-box" :title="`Nota: ${post.metadata.rating} de 5`">
            <span class="stars">{{ renderRatingStars(post.metadata.rating) }}</span>
            <span class="rating-num">{{ post.metadata.rating }}</span>
          </div>

          <span v-if="post.metadata?.type === 'completed'" class="completed-pill">
            🏆 Série Concluída
          </span>

          <span v-if="post.metadata?.season_number && post.metadata?.episode_number" class="ep-code-pill">
            {{ formatEpCode(post.metadata.season_number, post.metadata.episode_number) }}
            <span v-if="post.metadata.episode_name">• {{ post.metadata.episode_name }}</span>
          </span>

          <span v-if="seriesWatchedDate" class="watched-date-pill">
            📅 {{ formatDate(seriesWatchedDate) }}
          </span>

          <span v-if="post.metadata?.is_spoiler" class="spoiler-warning-pill">
            ⚠️ Spoiler
          </span>
        </div>

        <div v-if="seriesCommentText" class="ent-review-text">
          <FormattedContent :content="seriesCommentText" />
        </div>

        <div class="ent-footer-link-row">
          <button
            type="button"
            class="ent-external-link capyshowtime-btn"
            @click="openSeriesInCapyShowTime"
          >
            [ Abrir no CapyShowTime ↗ ]
          </button>
        </div>
      </div>
    </div>

    <!-- Game Subcard (Jogo / Xbox / Análise) -->
    <div v-if="isGamePost && (post.metadata?.game_title || post.content)" class="post-entertainment-subcard game-subcard">
      <div
        v-if="post.metadata?.box_art_url"
        class="ent-media-stage boxart-stage"
        @click="openMediaPreview(post.metadata.box_art_url, post.metadata.game_title, post.metadata.platform)"
        title="Clique para ampliar a capa"
      >
        <img
          :src="post.metadata.box_art_url"
          :alt="post.metadata.game_title || 'Capa do jogo'"
          class="ent-media-thumb game-boxart-thumb"
          loading="lazy"
        />
        <span class="zoom-pill">🔍</span>
      </div>
      <div v-else class="ent-media-stage placeholder-stage">
        <span class="placeholder-icon">🎮</span>
      </div>

      <div class="ent-media-content">
        <div class="ent-title-row">
          <h3 class="ent-main-title">
            {{ post.metadata?.game_title || 'Jogo' }}
          </h3>
          <span v-if="post.metadata?.platform" class="ent-platform-tag">
            [{{ post.metadata.platform }}]
          </span>
        </div>

        <div class="ent-meta-row">
          <span class="game-status-pill" :class="gameStatusLabel.class">
            {{ gameStatusLabel.text }}
          </span>

          <div v-if="post.metadata?.rating" class="ent-rating-box" :title="`Nota: ${post.metadata.rating} de 5`">
            <span class="stars">{{ renderRatingStars(post.metadata.rating) }}</span>
            <span class="rating-num">{{ post.metadata.rating }}</span>
          </div>

          <span v-if="post.metadata?.gamerscore != null" class="gamerscore-pill" title="Gamerscore conquistado">
            🎮 {{ post.metadata.gamerscore }} G
          </span>

          <span v-if="post.metadata?.hours_played" class="hours-pill" title="Horas jogadas">
            ⏱️ {{ post.metadata.hours_played }}h
          </span>
        </div>

        <div v-if="post.content" class="ent-review-text">
          <FormattedContent :content="post.content" />
        </div>
      </div>
    </div>

    <!-- Music Card (quando a própria publicação for de música/Spotify) -->
    <div v-if="isMusicPost && post.metadata?.track_title" class="post-music-card">
      <div class="music-card-stage">
        <img
          v-if="post.metadata.album_art"
          :src="post.metadata.album_art"
          :alt="post.metadata.track_title"
          class="music-card-art"
          loading="lazy"
        />
        <div v-else class="music-card-placeholder">🎵</div>
      </div>
      <div class="music-card-details">
        <div class="music-card-title-row">
          <span class="music-card-track" :title="post.metadata.track_title || undefined">{{ post.metadata.track_title }}</span>
        </div>
        <span class="music-card-artist" :title="post.metadata.track_artist || post.metadata.artist || undefined">
          {{ post.metadata.track_artist || post.metadata.artist }}
        </span>
        <span v-if="post.metadata.track_album || post.metadata.album" class="music-card-album" :title="post.metadata.track_album || post.metadata.album || undefined">
          Álbum: <em>{{ post.metadata.track_album || post.metadata.album }}</em>
        </span>
        <div class="music-card-footer">
          <a
            v-if="post.metadata.spotify_url"
            :href="post.metadata.spotify_url"
            target="_blank"
            rel="noopener noreferrer"
            class="music-spotify-link"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#1DB954">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.306c-.218.358-.682.473-1.04.254-2.854-1.743-6.446-2.138-10.678-1.171-.409.093-.815-.162-.909-.57-.093-.408.162-.814.57-.908 4.637-1.06 8.608-.61 11.803 1.345.358.219.473.682.254 1.05zm1.472-3.276c-.274.446-.86.588-1.306.314-3.267-2.008-8.246-2.59-12.11-1.417-.499.152-1.03-.133-1.182-.633-.152-.5.133-1.03.633-1.182 4.417-1.34 9.914-.693 13.651 1.612.446.274.588.86.314 1.306zm.126-3.41C15.202 8.293 8.76 8.08 5.097 9.193c-.6.182-1.237-.16-1.419-.76-.182-.6.16-1.236.76-1.418 4.22-1.282 11.332-1.036 15.727 1.574.54.32.716 1.026.396 1.566-.32.54-1.026.716-1.566.396z"/>
            </svg>
            <span>Ouvir no Spotify ↗</span>
          </a>
          <span v-if="post.metadata.reposted_from" class="music-reposted-from">
            • Compartilhado do perfil de @{{ post.metadata.reposted_from }}
          </span>
        </div>
      </div>
    </div>

    <!-- Embedded Repost Card (if post is a repost) -->
    <div
      v-if="post.reposted_post"
      class="embedded-repost-box"
      role="link"
      tabindex="0"
      title="Clique para ver os detalhes da publicação original"
      @click="handleRepostBoxClick"
      @keydown.enter="handleRepostBoxClick"
    >
      <!-- Entertainment Repost (Music, Film, or Game) -->
      <template v-if="isEntertainmentRepost">
        <div class="embedded-repost-header">
          <div class="embedded-repost-header-left">
            <span
              v-if="post.reposted_post.entertainment_type === 'music' || post.reposted_post.external_source === 'spotify'"
              class="embedded-repost-tag spotify-tag"
            >
              🎵 Spotify
            </span>
            <span
              v-else-if="post.reposted_post.entertainment_type === 'game'"
              class="embedded-repost-tag"
              :class="post.reposted_post.external_source === 'xbox' ? 'xbox-tag' : 'game-tag'"
            >
              {{ post.reposted_post.external_source === 'xbox' ? '🎮 Xbox Live' : '🕹️ Análise' }}
            </span>
            <span v-else class="embedded-repost-tag letterboxd-tag">🍿 Letterboxd</span>
            <span class="embedded-repost-author">
              {{ (post.reposted_post.entertainment_type === 'music' || post.reposted_post.external_source === 'spotify') ? 'Compartilhado por' : 'Avaliação de' }} <router-link :to="`/profile/${post.reposted_post.user?.username}`" class="embedded-author-link">@{{ post.reposted_post.user?.username }}</router-link>
            </span>
          </div>
          <span class="embedded-repost-action-hint">Ver original ↗</span>
        </div>
        <div class="embedded-repost-body">
          <img
            v-if="post.reposted_post.metadata?.album_art || post.reposted_post.metadata?.poster_url || post.reposted_post.metadata?.box_art_url"
            :src="post.reposted_post.metadata?.album_art || post.reposted_post.metadata?.poster_url || post.reposted_post.metadata?.box_art_url || ''"
            :alt="post.reposted_post.metadata?.track_title || post.reposted_post.metadata?.film_title || post.reposted_post.metadata?.game_title || 'Pôster/Capa'"
            class="embedded-poster"
            @click="openPoster(post.reposted_post.metadata?.album_art || post.reposted_post.metadata?.poster_url || post.reposted_post.metadata?.box_art_url)"
            title="Clique para ampliar"
          />
          <div class="embedded-details">
            <div class="embedded-title-row">
              <span class="embedded-film-title">{{ post.reposted_post.metadata?.track_title || post.reposted_post.metadata?.film_title || post.reposted_post.metadata?.game_title }}</span>
              <span v-if="post.reposted_post.metadata?.track_artist || post.reposted_post.metadata?.artist" class="embedded-film-year">• {{ post.reposted_post.metadata.track_artist || post.reposted_post.metadata.artist }}</span>
              <span v-else-if="post.reposted_post.metadata?.film_year" class="embedded-film-year">({{ post.reposted_post.metadata.film_year }})</span>
              <span v-else-if="post.reposted_post.metadata?.platform" class="embedded-film-year">[{{ post.reposted_post.metadata.platform }}]</span>
            </div>
            <p v-if="post.reposted_post.metadata?.track_album || post.reposted_post.metadata?.album" class="embedded-track-album">
              Álbum: <em>{{ post.reposted_post.metadata.track_album || post.reposted_post.metadata.album }}</em>
            </p>
            <div v-if="post.reposted_post.metadata?.rating" class="embedded-rating">
              <span class="embedded-stars">{{ renderRatingStars(post.reposted_post.metadata.rating) }}</span>
              <span class="embedded-score">{{ post.reposted_post.metadata.rating }} / 5</span>
            </div>
            <div v-else-if="post.reposted_post.metadata?.gamerscore != null" class="embedded-rating">
              <span class="embedded-score">🎮 {{ post.reposted_post.metadata.gamerscore }} G</span>
            </div>
            <p v-if="post.reposted_post.content" class="embedded-review">
              "{{ post.reposted_post.content }}"
            </p>
            <a
              v-if="post.reposted_post.metadata?.spotify_url"
              :href="post.reposted_post.metadata.spotify_url"
              target="_blank"
              rel="noopener noreferrer"
              class="embedded-external-link spotify-link"
            >
              [ Ouvir no Spotify ↗ ]
            </a>
            <a
              v-else-if="post.reposted_post.metadata?.letterboxd_url"
              :href="post.reposted_post.metadata.letterboxd_url"
              target="_blank"
              rel="noopener noreferrer"
              class="embedded-external-link"
            >
              [ Ver no Letterboxd ↗ ]
            </a>
          </div>
        </div>
      </template>

      <!-- Feed Post Repost -->
      <template v-else>
        <div class="embedded-repost-header">
          <div class="embedded-repost-header-left">
            <span class="embedded-repost-tag feed-tag">💬 Publicação</span>
            <span class="embedded-repost-author">
              Publicação de <router-link :to="`/profile/${post.reposted_post.user?.username}`" class="embedded-author-link">@{{ post.reposted_post.user?.username }}</router-link>
            </span>
          </div>
          <span class="embedded-repost-action-hint">Ver original ↗</span>
        </div>
        <div class="embedded-feed-body">
          <div v-if="post.reposted_post.content" class="embedded-feed-text">
            <FormattedContent :content="post.reposted_post.content" />
          </div>
          <div v-if="post.reposted_post.media && post.reposted_post.media.length" class="embedded-feed-media-preview">
            <div
              v-for="(item, idx) in post.reposted_post.media.slice(0, 3)"
              :key="item.id || idx"
              class="embedded-media-item"
            >
              <img
                v-if="item.type !== 'video'"
                :src="resolveMediaUrl(item.url || item.path)"
                alt="Mídia repostada"
                class="embedded-media-thumb"
                @click="openRepostedMediaModal(post.reposted_post.media, idx)"
              />
              <div v-else class="embedded-video-badge">
                ▶ Vídeo
              </div>
            </div>
            <span v-if="post.reposted_post.media.length > 3" class="embedded-media-more">
              +{{ post.reposted_post.media.length - 3 }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Post Poll -->
    <div v-if="post.poll" class="post-poll-container">
      <PollCard :post-id="post.id" :poll="post.poll" :is-author="isAuthor" />
    </div>

    <!-- Recap Card Action Trigger -->
    <div v-if="isRecapPost" class="recap-action-banner">
      <button
        type="button"
        class="recap-card-btn"
        @click="showRecapModal = true"
      >
        <span class="recap-card-btn-icon">🖼️</span>
        <div class="recap-card-btn-content">
          <span class="recap-card-btn-title">Salvar ou Compartilhar Card</span>
          <span class="recap-card-btn-subtitle">Baixar imagem em alta definição ou compartilhar nos Stories</span>
        </div>
        <span class="recap-card-btn-arrow">→</span>
      </button>
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
            class="carousel-media zoomable-media"
            loading="lazy"
            decoding="async"
            title="Clique para ampliar e dar zoom"
            @click="openMediaModal(index)"
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

      <button
        v-if="authStore.isAuthenticated"
        type="button"
        class="action-btn repost-btn"
        title="Compartilhar esta publicação no feed"
        @click="showRepostModal = true"
      >
        <span class="icon">🔁</span>
        <span>Repostar</span>
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
                {{ isThreadExpanded(item.comment.id)
                  ? 'Ocultar respostas'
                  : (item.repliesCount === 1 ? 'Ver 1 resposta' : `Ver ${item.repliesCount} respostas`)
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

    <!-- Edit Post Modal -->
    <PostEditModal
      v-model="showEditModal"
      :post="post"
    />

    <!-- Repost Modal -->
    <RepostModal
      v-model="showRepostModal"
      :post="post"
      @reposted="handleRepostCreated"
    />

    <!-- Recap Card Modal -->
    <RecapCardModal
      v-if="isRecapPost"
      v-model="showRecapModal"
      :post="post"
    />

    <!-- Confirm Delete Post Modal -->
    <RetroConfirmModal
      v-model="showDeleteModal"
      title="» Excluir Publicação"
      message="Tem certeza que deseja excluir esta publicação?"
      details="Essa ação é permanente e removerá todas as curtidas e comentários associados."
      confirmText="Excluir"
      :loading="isDeleting"
      @confirm="confirmDeletePost"
    />

    <!-- Confirm Delete Comment Modal -->
    <RetroConfirmModal
      v-model="showDeleteCommentModal"
      title="» Excluir Comentário"
      message="Tem certeza que deseja excluir este comentário?"
      confirmText="Excluir"
      :loading="isDeletingComment"
      @confirm="confirmDeleteComment"
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
  content-visibility: auto;
  contain-intrinsic-size: 0 350px;
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

.mentions-indicator {
  color: var(--color-primary-700, #7d5628);
}

.post-mention-tag {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  text-decoration: none;
}
.post-mention-tag:hover {
  text-decoration: underline;
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

.recap-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
  margin-left: 0.4rem;
  vertical-align: middle;
  letter-spacing: -0.01em;
}

:deep([data-theme='dark']) .recap-badge,
:global([data-theme='dark']) .recap-badge {
  background-color: #78350f;
  color: #fef3c7;
  border-color: #b45309;
}

.birthday-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background-color: #fce7f3;
  color: #9d174d;
  border: 1px solid #f472b6;
  margin-left: 0.4rem;
  vertical-align: middle;
  letter-spacing: -0.01em;
}

:deep([data-theme='dark']) .birthday-badge,
:global([data-theme='dark']) .birthday-badge {
  background-color: #831843;
  color: #fce7f3;
  border-color: #db2777;
}

/* Media Type Badges in Header */
.media-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  margin-left: 0.35rem;
  vertical-align: middle;
  letter-spacing: -0.01em;
}

.movie-badge {
  background-color: #ffedd5;
  color: #9a3412;
  border: 1px solid #fb923c;
}
:deep([data-theme='dark']) .movie-badge,
:global([data-theme='dark']) .movie-badge {
  background-color: #7c2d12;
  color: #ffedd5;
  border-color: #ea580c;
}

.series-badge {
  background-color: #fef08a;
  color: #854d0e;
  border: 1px solid #eab308;
}
:deep([data-theme='dark']) .series-badge,
:global([data-theme='dark']) .series-badge {
  background-color: #713f12;
  color: #fef08a;
  border-color: #ca8a04;
}

.game-badge {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #34d399;
}
.game-badge.xbox-badge {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #22c55e;
}
:deep([data-theme='dark']) .game-badge,
:global([data-theme='dark']) .game-badge {
  background-color: #064e3b;
  color: #d1fae5;
  border-color: #059669;
}

.spotify-badge {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #4ade80;
}
:deep([data-theme='dark']) .spotify-badge,
:global([data-theme='dark']) .spotify-badge {
  background-color: #14532d;
  color: #dcfce7;
  border-color: #22c55e;
}

/* Entertainment Subcards (Movies, Series, Games) */
.post-entertainment-subcard {
  display: flex;
  gap: 1rem;
  padding: 0.85rem 1rem;
  margin: 0.5rem 1rem 0.75rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 3px;
  transition: border-color 0.15s ease;
}
.post-entertainment-subcard:hover {
  border-color: var(--color-primary-300, #dab48e);
}

.ent-media-stage {
  flex-shrink: 0;
  position: relative;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  cursor: pointer;
}

.poster-stage {
  width: 84px;
  height: 126px;
}

.boxart-stage {
  width: 90px;
  height: 120px;
}

.placeholder-stage {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary-100, #f3ede6);
}
.placeholder-stage .placeholder-icon {
  font-size: 2rem;
}

.ent-media-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.zoom-pill {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 3px;
  pointer-events: none;
}

.ent-media-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ent-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.ent-main-title {
  margin: 0;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-primary-900, #46280b);
  line-height: 1.3;
}

.ent-year-tag,
.ent-platform-tag {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  color: var(--color-muted, #847062);
  font-weight: 600;
}

.ent-meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
}

.ent-rating-box {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  font-weight: 700;
}
.ent-rating-box .stars {
  color: #d97706;
  letter-spacing: 1px;
}

.no-rating-pill {
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  font-style: italic;
}

.rewatch-pill,
.completed-pill,
.ep-code-pill,
.watched-date-pill,
.spoiler-warning-pill,
.gamerscore-pill,
.hours-pill {
  font-family: var(--font-heading, monospace);
  font-size: 0.72rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.rewatch-pill {
  background: #ede9fe;
  color: #5b21b6;
  border: 1px solid #c4b5fd;
}

.completed-pill {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
  font-weight: 700;
}

.ep-code-pill {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #a5b4fc;
  font-weight: 700;
}

.watched-date-pill {
  color: var(--color-muted, #847062);
}

.spoiler-warning-pill {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
  font-weight: 700;
}

.gamerscore-pill {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #86efac;
  font-weight: 700;
}

.hours-pill {
  background: var(--color-primary-100, #f3ede6);
  color: var(--color-primary-800, #5f4120);
  border: 1px solid var(--color-border, #D8CDC5);
}

.game-status-pill {
  font-family: var(--font-heading, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 3px;
}
.status-mastered {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}
.status-completed {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #34d399;
}
.status-playing {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #7dd3fc;
}
.status-dropped {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
.status-wishlist {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #d1d5db;
}

.ent-review-text {
  font-size: 0.88rem;
  color: var(--color-text, #2c2523);
  line-height: 1.5;
  margin-top: 0.35rem;
}

.ent-footer-link-row {
  margin-top: 0.4rem;
}

.ent-external-link {
  display: inline-block;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.76rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary, #a66130);
  transition: color 0.15s ease;
}
.ent-external-link:hover {
  color: var(--color-primary-700, #7d5628);
  text-decoration: underline;
}

@media (max-width: 640px) {
  .post-entertainment-subcard {
    flex-direction: column;
    align-items: flex-start;
  }
  .poster-stage,
  .boxart-stage {
    width: 90px;
    height: 135px;
  }
}

.recap-action-banner {
  padding: 0.25rem 1rem 0.75rem;
}

.recap-card-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1.5px solid #f59e0b;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.recap-card-btn:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.recap-card-btn-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.recap-card-btn-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.recap-card-btn-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.88rem;
  font-weight: 700;
  color: #78350f;
}

.recap-card-btn-subtitle {
  font-size: 0.75rem;
  color: #92400e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recap-card-btn-arrow {
  font-family: var(--font-heading, monospace);
  font-size: 1.1rem;
  font-weight: bold;
  color: #b45309;
}

:deep([data-theme='dark']) .recap-card-btn,
:global([data-theme='dark']) .recap-card-btn {
  background: linear-gradient(135deg, #451a03 0%, #78350f 100%);
  border-color: #b45309;
}

:deep([data-theme='dark']) .recap-card-btn-title,
:global([data-theme='dark']) .recap-card-btn-title {
  color: #fef3c7;
}

:deep([data-theme='dark']) .recap-card-btn-subtitle,
:global([data-theme='dark']) .recap-card-btn-subtitle {
  color: #fde68a;
}

:deep([data-theme='dark']) .recap-card-btn-arrow,
:global([data-theme='dark']) .recap-card-btn-arrow {
  color: #fbbf24;
}

.post-menu-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.post-menu-trigger {
  background: none;
  border: 1px solid transparent;
  color: var(--color-muted, #8c7e72);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.15rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  transition: all 0.15s ease;
}

.post-menu-trigger:hover {
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border, #d8cdc5);
}

.post-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: var(--color-bg, #ffffff);
  border: 1px solid var(--color-border, #d8cdc5);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.14);
  border-radius: 2px;
  z-index: 30;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0;
}

.post-menu-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.65rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.1s ease;
}

.post-menu-item .item-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.post-menu-item.edit-item {
  color: var(--color-primary-800, #7d5628);
}
.post-menu-item.edit-item:hover {
  background-color: var(--color-primary-50, #fdf8f3);
}

.post-menu-item.delete-item {
  color: var(--color-danger, #ef4444);
}
.post-menu-item.delete-item:hover {
  background-color: #fee2e2;
}

.post-body {
  padding: 1rem;
  font-family: var(--font-body, 'Outfit', sans-serif);
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #222222;
}

.post-poll-container {
  padding: 0 1rem 0.75rem;
}

.post-body.recap-body {
  padding: 0.5rem 0.75rem 0.25rem;
  white-space: normal;
}

@media (max-width: 480px) {
  .post-body.recap-body {
    padding: 0.35rem 0.35rem 0.2rem;
  }
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

.carousel-media.zoomable-media {
  cursor: zoom-in;
  transition: opacity 0.15s ease;
}

.carousel-media.zoomable-media:hover {
  opacity: 0.95;
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
  transition: margin-left 0.2s ease;
}

.comment-item.is-reply {
  margin-left: 1.5rem;
  position: relative;
}

.comment-item.is-deep-reply {
  margin-left: 2.5rem;
  position: relative;
}

.comment-item.is-reply::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: -0.75rem;
  width: 0.75rem;
  height: calc(0.75rem + 16px);
  border-left: 2px solid var(--color-primary-300, #c89d70);
  border-bottom: 2px solid var(--color-primary-300, #c89d70);
  border-bottom-left-radius: 4px;
  pointer-events: none;
}

.comment-reply-context {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
  padding: 0.2rem 0.45rem;
  background: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  line-height: 1.3;
}

.reply-symbol {
  font-weight: bold;
  color: var(--color-primary, #a66130);
}

.reply-to-text {
  font-family: var(--font-body);
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
  color: var(--color-muted, #847062);
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-content-box {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  border-radius: 2px;
  min-width: 0;
}

.comment-avatar-link {
  flex-shrink: 0;
  display: flex;
  text-decoration: none;
}

.comment-user-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.2rem;
  gap: 0.5rem;
}

.comment-user-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
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
  color: var(--color-muted);
  white-space: nowrap;
}

.comment-edited-tag {
  font-size: 0.65rem;
  color: var(--color-muted);
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
  color: var(--color-muted, #847062);
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
  color: var(--color-danger, #ef4444);
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
  font-family: var(--font-body);
  border: 1px solid var(--color-primary);
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
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--color-primary);
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
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  border-radius: 2px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
}
.comment-cancel-btn:hover {
  background-color: var(--color-primary-50);
}

.comment-text {
  font-family: var(--font-body);
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
  color: var(--color-muted, #847062);
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

/* Inline Reply Form under comment */
.comment-inline-reply {
  margin-top: 0.45rem;
  padding: 0.45rem 0.6rem;
  background: var(--color-primary-50, #fdf8f3);
  border: 1px solid var(--color-primary-200, #d5bba2);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  animation: fadeIn 0.15s ease-in-out;
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
  color: var(--color-danger, #dc2626);
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
  font-family: var(--font-body);
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.inline-reply-input:focus {
  border-color: var(--color-primary);
}

.inline-reply-submit-btn {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  background-color: var(--color-primary);
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

.no-comments {
  font-size: 0.8rem;
  color: var(--color-muted);
  text-align: center;
  padding: 0.75rem 0.5rem;
}

/* Top Comment Form */
.comment-form-container {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
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
  font-family: var(--font-body);
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
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
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
}
.comment-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Thread Replies Toggle Button */
.thread-toggle-wrapper {
  margin-left: 2.1rem;
  margin-top: -0.35rem;
  margin-bottom: 0.25rem;
}

.toggle-replies-btn {
  background: none;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.73rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  cursor: pointer;
  padding: 0.2rem 0.45rem;
  border-radius: 2px;
  transition: all 0.15s ease;
  line-height: 1;
}

.toggle-replies-btn:hover {
  background-color: var(--color-primary-50, #fdf8f3);
  color: var(--color-primary-800, #5f4120);
}

.toggle-icon {
  font-size: 0.8rem;
  font-weight: bold;
}

@media (max-width: 480px) {
  .comment-item.is-reply {
    margin-left: 1.0rem;
  }
  .comment-item.is-deep-reply {
    margin-left: 1.5rem;
  }
  .comment-item.is-reply::before,
  .comment-item.is-deep-reply::before {
    left: -0.75rem;
    width: 0.55rem;
  }
  .reply-quote-preview {
    max-width: 130px;
  }
  .comment-form-row {
    gap: 0.35rem;
  }
  .comment-submit-btn {
    font-size: 0.75rem;
    padding: 0 0.5rem;
  }
  .inline-reply-row {
    gap: 0.3rem;
  }
  .inline-reply-submit-btn {
    font-size: 0.72rem;
    padding: 0 0.45rem;
  }
  .thread-toggle-wrapper {
    margin-left: 1.1rem;
  }
  .toggle-replies-btn {
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
  }
}

/* Repost styles */
.repost-badge {
  font-size: 0.7rem;
  color: #2b6cb0;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
}

.embedded-repost-box {
  margin: 0.75rem 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.embedded-repost-box:hover {
  border-color: var(--color-primary, #a66130);
  background-color: var(--color-primary-100, #fdf8f3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.embedded-repost-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.embedded-repost-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.embedded-repost-action-hint {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  color: var(--color-primary, #a66130);
  font-weight: 700;
  white-space: nowrap;
  opacity: 0.85;
  transition: opacity 0.15s ease;
}

.embedded-repost-box:hover .embedded-repost-action-hint {
  opacity: 1;
  text-decoration: underline;
}

.embedded-repost-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  line-height: 1.2;
}

.embedded-repost-tag.letterboxd-tag {
  background-color: #ffedd5;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.embedded-repost-tag.xbox-tag {
  background-color: #e8f5e9;
  color: #107c10;
  border: 1px solid #c8e6c9;
}

.embedded-repost-tag.game-tag {
  background-color: #f3e8ff;
  color: #7e22ce;
  border: 1px solid #e9d5ff;
}

.embedded-repost-author {
  color: #718096;
}

.embedded-author-link {
  color: var(--color-primary-900, #3d2a14);
  font-weight: 600;
  text-decoration: none;
}
.embedded-author-link:hover {
  text-decoration: underline;
}

.embedded-repost-body {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.embedded-poster {
  width: 50px;
  height: 75px;
  object-fit: cover;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  flex-shrink: 0;
  cursor: pointer;
}

.embedded-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.embedded-title-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.embedded-film-title {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary-900, #3d2a14);
}

.embedded-film-year {
  font-size: 0.8rem;
  color: #718096;
}

.embedded-rating {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.embedded-stars {
  color: #00c030;
  letter-spacing: 1px;
}

.embedded-score {
  font-size: 0.75rem;
  color: #718096;
  font-family: var(--font-mono, monospace);
}

.embedded-review {
  font-size: 0.85rem;
  color: #4a5568;
  font-style: italic;
  margin: 0.2rem 0;
  line-height: 1.4;
}

.embedded-external-link {
  font-size: 0.75rem;
  color: var(--color-primary, #a66130);
  font-family: var(--font-mono, monospace);
  font-weight: 600;
  text-decoration: none;
  margin-top: 0.2rem;
}
.embedded-external-link:hover {
  text-decoration: underline;
}

.embedded-repost-tag.feed-tag {
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.embedded-feed-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.embedded-feed-text {
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-primary-900, #3d2a14);
}

.embedded-feed-media-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.embedded-media-item {
  position: relative;
}

.embedded-media-thumb {
  width: 65px;
  height: 65px;
  object-fit: cover;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  cursor: pointer;
}

.embedded-media-thumb:hover {
  opacity: 0.85;
}

.embedded-video-badge {
  padding: 0.25rem 0.5rem;
  background-color: #1e293b;
  color: #f8fafc;
  font-size: 0.75rem;
  border-radius: 3px;
  font-family: var(--font-mono, monospace);
}

.embedded-media-more {
  font-size: 0.8rem;
  font-family: var(--font-mono, monospace);
  color: #718096;
}

.pinned-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  line-height: 1.2;
}

.post-menu-item.pin-item {
  color: var(--color-primary-800, #4a3b2c);
}
.post-menu-item.pin-item:hover {
  background-color: var(--retro-bg-hover, #f1ece4);
}

/* Post Music Card (Spotify / Last.fm) */
.post-music-card {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  margin: 0.6rem 0.75rem 0.75rem;
  padding: 0.75rem 0.85rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 4px;
}

.music-card-stage {
  flex-shrink: 0;
  width: 58px;
  height: 58px;
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid var(--color-border, #d8cdc5);
  background-color: #222;
}

.music-card-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.music-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background-color: #333;
}

.music-card-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  gap: 0.15rem;
}

.music-card-track {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-primary-900, #222);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-card-artist {
  font-size: 0.82rem;
  color: #15803d;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-card-album {
  font-size: 0.72rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}

.music-spotify-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: #15803d;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-mono, monospace);
}

.music-spotify-link:hover {
  color: #16a34a;
  text-decoration: underline;
}

.music-reposted-from {
  font-size: 0.7rem;
  color: #888;
  font-style: italic;
}

.embedded-repost-tag.spotify-tag {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.embedded-external-link.spotify-link {
  color: #15803d;
}

.embedded-track-album {
  font-size: 0.75rem;
  color: #718096;
  margin: 0;
}
</style>
