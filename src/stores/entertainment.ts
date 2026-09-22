import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Post, PostComment } from '@/types/models'
import * as postsApi from '@/api/posts'
import { connectEcho } from '@/services/echo'

const ENTERTAINMENT_CACHE_KEY = 'capihouse_entertainment_cache'

export type EntertainmentTab = 'movies' | 'series' | 'games'

interface EntertainmentCacheData {
  posts: Post[]
  lastPage: number
}

function loadInitialEntertainmentCache(): EntertainmentCacheData {
  try {
    const stored = localStorage.getItem(ENTERTAINMENT_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return { posts: parsed, lastPage: 1 }
      }
      if (parsed && Array.isArray(parsed.posts)) {
        return {
          posts: parsed.posts,
          lastPage: typeof parsed.lastPage === 'number' ? parsed.lastPage : 1,
        }
      }
    }
  } catch {}
  return { posts: [], lastPage: 1 }
}

function saveEntertainmentCache(data: Post[], lastPage: number) {
  try {
    localStorage.setItem(
      ENTERTAINMENT_CACHE_KEY,
      JSON.stringify({
        posts: data.slice(0, 15),
        lastPage,
      })
    )
  } catch {}
}

export const useEntertainmentStore = defineStore('entertainment', () => {
  const initialCache = loadInitialEntertainmentCache()
  const posts = ref<Post[]>(initialCache.posts)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(initialCache.lastPage)
  const hasLoaded = ref(initialCache.posts.length > 0)
  const activeTab = ref<EntertainmentTab>('movies')

  const hasMorePages = computed(() => currentPage.value < lastPage.value)

  const activeFilters = ref<{ search?: string; date?: string; startDate?: string; endDate?: string; userId?: number }>({})
  const isFiltered = ref(false)
  let isSubscribed = false

  async function fetchEntertainmentPosts(
    page = 1,
    options?: { search?: string; date?: string; startDate?: string; endDate?: string; userId?: number; forceRefresh?: boolean }
  ) {
    if (page > 1) {
      isLoadingMore.value = true
    } else {
      // Se não temos dados em cache ou é forceRefresh, exibe loading visual
      if (options?.forceRefresh || posts.value.length === 0) {
        isLoading.value = true
      }
    }

    if (options) {
      activeFilters.value = {
        search: options.search || undefined,
        date: options.date || undefined,
        startDate: options.startDate || undefined,
        endDate: options.endDate || undefined,
        userId: options.userId || undefined,
      }
    } else if (page === 1) {
      activeFilters.value = {}
    }

    const hasAnyFilter = Boolean(
      activeFilters.value.search ||
      activeFilters.value.date ||
      activeFilters.value.startDate ||
      activeFilters.value.endDate ||
      activeFilters.value.userId
    )

    try {
      const res = await postsApi.getPosts({
        page,
        category: 'entertainment',
        entertainmentType: activeTab.value === 'movies' ? 'movie' : (activeTab.value === 'games' ? 'game' : undefined),
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        startDate: activeFilters.value.startDate,
        endDate: activeFilters.value.endDate,
        userId: activeFilters.value.userId,
      })

      currentPage.value = res.data.current_page || 1
      lastPage.value = res.data.last_page || 1
      hasLoaded.value = true

      if (page === 1) {
        posts.value = res.data.data || []
        isFiltered.value = hasAnyFilter
        // Salva no cache local offline-first apenas se for a lista padrão de filmes sem filtros
        if (!hasAnyFilter && activeTab.value === 'movies') {
          saveEntertainmentCache(res.data.data || [], res.data.last_page || 1)
        }
      } else {
        const existingIds = new Set(posts.value.map(p => p.id))
        const newUniquePosts = (res.data.data || []).filter((p: Post) => !existingIds.has(p.id))
        posts.value.push(...newUniquePosts)
      }

      return res.data
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMorePosts() {
    if (isLoading.value || isLoadingMore.value || !hasMorePages.value) return
    await fetchEntertainmentPosts(currentPage.value + 1)
  }

  function setActiveTab(tab: EntertainmentTab) {
    if (activeTab.value === tab) return
    activeTab.value = tab
    currentPage.value = 1
    posts.value = []
    hasLoaded.value = false
    if (tab === 'movies' || tab === 'games') {
      fetchEntertainmentPosts(1, { forceRefresh: true })
    }
  }

  async function toggleLike(postId: number) {
    const targetPost = posts.value.find(p => p.id === postId)
    if (!targetPost) return

    const previousLiked = targetPost.is_liked
    const previousCount = targetPost.likes_count || 0
    const nextLiked = !previousLiked
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))

    targetPost.is_liked = nextLiked
    targetPost.likes_count = nextCount

    try {
      const res = await postsApi.toggleLike(postId)
      targetPost.is_liked = res.data.is_liked
      targetPost.likes_count = res.data.likes_count
      return res.data
    } catch (err) {
      targetPost.is_liked = previousLiked
      targetPost.likes_count = previousCount
      throw err
    }
  }

  async function addComment(postId: number, content: string, parentId?: number | null) {
    const res = await postsApi.addComment(postId, content, parentId)
    const targetPost = posts.value.find(p => p.id === postId)
    if (targetPost) {
      if (!targetPost.comments) targetPost.comments = []
      const existsIndex = targetPost.comments.findIndex(c => Number(c.id) === Number(res.data.id))
      if (existsIndex === -1) {
        targetPost.comments.push(res.data)
        targetPost.comments_count = (targetPost.comments_count || 0) + 1
      } else {
        targetPost.comments[existsIndex] = res.data
      }
    }
    return res.data
  }

  async function updateComment(postId: number, commentId: number, content: string) {
    const res = await postsApi.updateComment(commentId, content)
    const targetPost = posts.value.find(p => p.id === postId)
    if (targetPost && targetPost.comments) {
      const existsIndex = targetPost.comments.findIndex(c => Number(c.id) === Number(commentId))
      if (existsIndex !== -1) {
        targetPost.comments[existsIndex] = res.data
      }
    }
    return res.data
  }

  async function deleteComment(postId: number, commentId: number) {
    await postsApi.deleteComment(commentId)
    const targetPost = posts.value.find(p => p.id === postId)
    if (targetPost && targetPost.comments) {
      targetPost.comments = targetPost.comments.filter(c => Number(c.id) !== Number(commentId))
      targetPost.comments_count = Math.max(0, (targetPost.comments_count || 1) - 1)
    }
  }

  async function toggleCommentLike(postId: number, commentId: number) {
    const targetPost = posts.value.find(p => p.id === postId)
    const targetComment = targetPost?.comments?.find(c => Number(c.id) === Number(commentId))
    if (!targetComment) return

    const prevLiked = !!targetComment.is_liked
    const prevCount = targetComment.likes_count ?? 0
    const nextLiked = !prevLiked
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1))

    targetComment.is_liked = nextLiked
    targetComment.likes_count = nextCount

    try {
      const res = await postsApi.toggleCommentLike(commentId)
      targetComment.is_liked = res.data.is_liked
      targetComment.likes_count = res.data.likes_count
      return res.data
    } catch (err) {
      targetComment.is_liked = prevLiked
      targetComment.likes_count = prevCount
      throw err
    }
  }

  async function deletePost(postId: number) {
    await postsApi.deletePost(postId)
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  function subscribeToEntertainment(currentUserId?: number) {
    if (isSubscribed) return
    isSubscribed = true

    const echo = connectEcho()
    const channel = echo.channel('posts')

    channel
      .listen('.PostCreated', (data: { post: Post }) => {
        if (data.post.category !== 'entertainment') return
        if (activeTab.value === 'movies' && data.post.entertainment_type !== 'movie') return
        if (activeTab.value === 'games' && data.post.entertainment_type !== 'game') return
        const exists = posts.value.some(p => p.id === data.post.id)
        if (!exists) {
          posts.value.unshift(data.post)
        }
      })
      .listen('.PostLiked', (data: { post_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        if (currentUserId && data.user_id === currentUserId) return
        const targetPost = posts.value.find(p => p.id === data.post_id)
        if (targetPost) {
          targetPost.likes_count = data.likes_count
        }
      })
      .listen('.PostDeleted', (data: { id: number }) => {
        posts.value = posts.value.filter(p => p.id !== data.id)
      })
      .listen('.CommentCreated', (data: { post_id: number; comment: PostComment; comments_count: number }) => {
        const targetPost = posts.value.find(p => p.id === data.post_id)
        if (targetPost) {
          targetPost.comments_count = data.comments_count
          if (!targetPost.comments) targetPost.comments = []
          const existsIndex = targetPost.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
          if (existsIndex === -1) {
            targetPost.comments.push(data.comment)
          } else {
            targetPost.comments[existsIndex] = data.comment
          }
        }
      })
      .listen('.CommentUpdated', (data: { post_id: number; comment: PostComment }) => {
        const targetPost = posts.value.find(p => p.id === data.post_id)
        if (targetPost && targetPost.comments) {
          const existsIndex = targetPost.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
          if (existsIndex !== -1) {
            targetPost.comments[existsIndex] = data.comment
          }
        }
      })
      .listen('.CommentDeleted', (data: { comment_id: number; post_id: number; comments_count: number }) => {
        const targetPost = posts.value.find(p => p.id === data.post_id)
        if (targetPost) {
          targetPost.comments_count = data.comments_count
          if (targetPost.comments) {
            targetPost.comments = targetPost.comments.filter(c => Number(c.id) !== Number(data.comment_id))
          }
        }
      })
      .listen('.CommentLiked', (data: { post_id: number; comment_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        if (currentUserId && data.user_id === currentUserId) return
        const targetPost = posts.value.find(p => p.id === data.post_id)
        if (targetPost && targetPost.comments) {
          const comment = targetPost.comments.find(c => Number(c.id) === Number(data.comment_id))
          if (comment) {
            comment.likes_count = data.likes_count
          }
        }
      })
  }

  function addPost(newPost: Post) {
    const exists = posts.value.some(p => p.id === newPost.id)
    if (!exists) {
      posts.value.unshift(newPost)
    }
  }

  return {
    posts,
    isLoading,
    isLoadingMore,
    currentPage,
    lastPage,
    hasLoaded,
    hasMorePages,
    activeTab,
    activeFilters,
    isFiltered,
    fetchEntertainmentPosts,
    loadMorePosts,
    setActiveTab,
    addPost,
    toggleLike,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    deletePost,
    subscribeToEntertainment,
  }
})
