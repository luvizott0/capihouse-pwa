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

  // Movie state
  const moviePosts = ref<Post[]>(initialCache.posts)
  const movieCurrentPage = ref(1)
  const movieLastPage = ref(initialCache.lastPage)
  const movieHasLoaded = ref(initialCache.posts.length > 0)
  const movieIsLoadingMore = ref(false)
  const pendingMoviePosts = ref<Post[]>([])

  // Games state
  const gamePosts = ref<Post[]>([])
  const gameCurrentPage = ref(1)
  const gameLastPage = ref(1)
  const gameHasLoaded = ref(false)
  const gameIsLoadingMore = ref(false)
  const pendingGamePosts = ref<Post[]>([])

  const isLoading = ref(false)
  const activeTab = ref<EntertainmentTab>('movies')

  // Unified reactive views for current tab
  const posts = computed<Post[]>({
    get: () => (activeTab.value === 'games' ? gamePosts.value : moviePosts.value),
    set: (val: Post[]) => {
      if (activeTab.value === 'games') {
        gamePosts.value = val
      } else {
        moviePosts.value = val
      }
    },
  })

  const currentPage = computed(() =>
    activeTab.value === 'games' ? gameCurrentPage.value : movieCurrentPage.value
  )
  const lastPage = computed(() =>
    activeTab.value === 'games' ? gameLastPage.value : movieLastPage.value
  )
  const hasLoaded = computed(() =>
    activeTab.value === 'games' ? gameHasLoaded.value : movieHasLoaded.value
  )
  const isLoadingMore = computed(() =>
    activeTab.value === 'games' ? gameIsLoadingMore.value : movieIsLoadingMore.value
  )
  const hasMorePages = computed(() => currentPage.value < lastPage.value)

  const pendingPosts = computed(() =>
    activeTab.value === 'games' ? pendingGamePosts.value : pendingMoviePosts.value
  )
  const pendingCount = computed(() => pendingPosts.value.length)

  const activeFilters = ref<{
    search?: string
    date?: string
    startDate?: string
    endDate?: string
    userId?: number
  }>({})
  const isFiltered = ref(false)
  let isSubscribed = false

  async function fetchEntertainmentPosts(
    page = 1,
    options?: {
      search?: string
      date?: string
      startDate?: string
      endDate?: string
      userId?: number
      forceRefresh?: boolean
      tab?: EntertainmentTab
    }
  ) {
    const targetTab = options?.tab || activeTab.value

    if (page > 1) {
      if (targetTab === 'games') {
        gameIsLoadingMore.value = true
      } else {
        movieIsLoadingMore.value = true
      }
    } else {
      const currentList = targetTab === 'games' ? gamePosts.value : moviePosts.value
      if (options?.forceRefresh || currentList.length === 0) {
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
        entertainmentType: targetTab === 'movies' ? 'movie' : (targetTab === 'games' ? 'game' : undefined),
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        startDate: activeFilters.value.startDate,
        endDate: activeFilters.value.endDate,
        userId: activeFilters.value.userId,
      })

      const resCurrentPage = res?.data?.current_page ?? 1
      const resLastPage = res?.data?.last_page ?? 1
      const resData: Post[] = res?.data?.data ?? []

      if (targetTab === 'games') {
        gameCurrentPage.value = resCurrentPage
        gameLastPage.value = resLastPage
        gameHasLoaded.value = true

        if (page === 1) {
          gamePosts.value = resData
          isFiltered.value = hasAnyFilter
        } else {
          const existingIds = new Set(gamePosts.value.map(p => p.id))
          const newUnique = resData.filter((p: Post) => !existingIds.has(p.id))
          gamePosts.value.push(...newUnique)
        }
      } else {
        movieCurrentPage.value = resCurrentPage
        movieLastPage.value = resLastPage
        movieHasLoaded.value = true

        if (page === 1) {
          moviePosts.value = resData
          isFiltered.value = hasAnyFilter
          if (!hasAnyFilter) {
            saveEntertainmentCache(resData, resLastPage)
          }
        } else {
          const existingIds = new Set(moviePosts.value.map(p => p.id))
          const newUnique = resData.filter((p: Post) => !existingIds.has(p.id))
          moviePosts.value.push(...newUnique)
        }
      }

      return res.data
    } finally {
      isLoading.value = false
      if (targetTab === 'games') {
        gameIsLoadingMore.value = false
      } else {
        movieIsLoadingMore.value = false
      }
    }
  }

  async function loadMorePosts() {
    if (isLoading.value || isLoadingMore.value || !hasMorePages.value) return
    await fetchEntertainmentPosts(currentPage.value + 1)
  }

  function setActiveTab(tab: EntertainmentTab) {
    if (activeTab.value === tab) return
    activeTab.value = tab

    // Se a aba selecionada ainda não carregou dados, busca a primeira página
    const alreadyLoaded = tab === 'games' ? gameHasLoaded.value : movieHasLoaded.value
    if (!alreadyLoaded && (tab === 'movies' || tab === 'games')) {
      fetchEntertainmentPosts(1, { tab })
    }
  }

  function flushPendingPosts() {
    if (activeTab.value === 'games') {
      if (pendingGamePosts.value.length === 0) return
      const existingIds = new Set(gamePosts.value.map(p => p.id))
      const fresh = pendingGamePosts.value.filter(p => !existingIds.has(p.id))
      gamePosts.value.unshift(...fresh)
      pendingGamePosts.value = []
    } else {
      if (pendingMoviePosts.value.length === 0) return
      const existingIds = new Set(moviePosts.value.map(p => p.id))
      const fresh = pendingMoviePosts.value.filter(p => !existingIds.has(p.id))
      moviePosts.value.unshift(...fresh)
      pendingMoviePosts.value = []
    }
  }

  async function toggleLike(postId: number) {
    const postInMovies = moviePosts.value.find(p => p.id === postId)
    const postInGames = gamePosts.value.find(p => p.id === postId)
    const targetPost = postInMovies || postInGames
    if (!targetPost) return

    const previousLiked = targetPost.is_liked
    const previousCount = targetPost.likes_count || 0
    const nextLiked = !previousLiked
    const nextCount = Math.max(0, previousCount + (nextLiked ? 1 : -1))

    if (postInMovies) {
      postInMovies.is_liked = nextLiked
      postInMovies.likes_count = nextCount
    }
    if (postInGames) {
      postInGames.is_liked = nextLiked
      postInGames.likes_count = nextCount
    }

    try {
      const res = await postsApi.toggleLike(postId)
      if (postInMovies) {
        postInMovies.is_liked = res.data.is_liked
        postInMovies.likes_count = res.data.likes_count
      }
      if (postInGames) {
        postInGames.is_liked = res.data.is_liked
        postInGames.likes_count = res.data.likes_count
      }
      return res.data
    } catch (err) {
      if (postInMovies) {
        postInMovies.is_liked = previousLiked
        postInMovies.likes_count = previousCount
      }
      if (postInGames) {
        postInGames.is_liked = previousLiked
        postInGames.likes_count = previousCount
      }
      throw err
    }
  }

  async function addComment(postId: number, content: string, parentId?: number | null) {
    const res = await postsApi.addComment(postId, content, parentId)
    const updateTarget = (post?: Post) => {
      if (!post) return
      if (!post.comments) post.comments = []
      const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(res.data.id))
      if (existsIndex === -1) {
        post.comments.push(res.data)
        post.comments_count = (post.comments_count || 0) + 1
      } else {
        post.comments[existsIndex] = res.data
      }
    }
    updateTarget(moviePosts.value.find(p => p.id === postId))
    updateTarget(gamePosts.value.find(p => p.id === postId))
    return res.data
  }

  async function updateComment(postId: number, commentId: number, content: string) {
    const res = await postsApi.updateComment(commentId, content)
    const updateTarget = (post?: Post) => {
      if (!post || !post.comments) return
      const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(commentId))
      if (existsIndex !== -1) {
        post.comments[existsIndex] = res.data
      }
    }
    updateTarget(moviePosts.value.find(p => p.id === postId))
    updateTarget(gamePosts.value.find(p => p.id === postId))
    return res.data
  }

  async function deleteComment(postId: number, commentId: number) {
    await postsApi.deleteComment(commentId)
    const updateTarget = (post?: Post) => {
      if (!post || !post.comments) return
      post.comments = post.comments.filter(c => Number(c.id) !== Number(commentId))
      post.comments_count = Math.max(0, (post.comments_count || 1) - 1)
    }
    updateTarget(moviePosts.value.find(p => p.id === postId))
    updateTarget(gamePosts.value.find(p => p.id === postId))
  }

  async function toggleCommentLike(postId: number, commentId: number) {
    const postInMovies = moviePosts.value.find(p => p.id === postId)
    const postInGames = gamePosts.value.find(p => p.id === postId)
    const targetPost = postInMovies || postInGames
    const targetComment = targetPost?.comments?.find(c => Number(c.id) === Number(commentId))
    if (!targetComment) return

    const prevLiked = !!targetComment.is_liked
    const prevCount = targetComment.likes_count ?? 0
    const nextLiked = !prevLiked
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1))

    const updateCommentLikesLocally = (post?: Post) => {
      const c = post?.comments?.find(comm => Number(comm.id) === Number(commentId))
      if (c) {
        c.is_liked = nextLiked
        c.likes_count = nextCount
      }
    }
    updateCommentLikesLocally(postInMovies)
    updateCommentLikesLocally(postInGames)

    try {
      const res = await postsApi.toggleCommentLike(commentId)
      const applyConfirmedLikes = (post?: Post) => {
        const c = post?.comments?.find(comm => Number(comm.id) === Number(commentId))
        if (c) {
          c.is_liked = res.data.is_liked
          c.likes_count = res.data.likes_count
        }
      }
      applyConfirmedLikes(postInMovies)
      applyConfirmedLikes(postInGames)
      return res.data
    } catch (err) {
      const revertCommentLikes = (post?: Post) => {
        const c = post?.comments?.find(comm => Number(comm.id) === Number(commentId))
        if (c) {
          c.is_liked = prevLiked
          c.likes_count = prevCount
        }
      }
      revertCommentLikes(postInMovies)
      revertCommentLikes(postInGames)
      throw err
    }
  }

  function removePostLocally(postId: number) {
    const id = Number(postId)
    moviePosts.value = moviePosts.value.filter(p => Number(p.id) !== id)
    gamePosts.value = gamePosts.value.filter(p => Number(p.id) !== id)
    pendingMoviePosts.value = pendingMoviePosts.value.filter(p => Number(p.id) !== id)
    pendingGamePosts.value = pendingGamePosts.value.filter(p => Number(p.id) !== id)
  }

  async function deletePost(postId: number) {
    removePostLocally(postId)
    try {
      await postsApi.deletePost(postId)
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status !== 404) {
        throw err
      }
    }
  }

  function addPost(newPost: Post) {
    if (newPost.entertainment_type === 'game') {
      const exists = gamePosts.value.some(p => Number(p.id) === Number(newPost.id))
      if (!exists) {
        gamePosts.value.unshift(newPost)
      }
    } else {
      const exists = moviePosts.value.some(p => Number(p.id) === Number(newPost.id))
      if (!exists) {
        moviePosts.value.unshift(newPost)
      }
    }
  }

  function subscribeToEntertainment(currentUserId?: number) {
    if (isSubscribed) return
    isSubscribed = true

    const echo = connectEcho()
    const channel = echo.channel('posts')

    channel
      .listen('.PostCreated', (data: { post: Post }) => {
        if (data.post.category !== 'entertainment') return
        // Don't show banner for author's own post (already prepended locally)
        if (currentUserId && data.post.user_id === currentUserId) return

        if (data.post.entertainment_type === 'game') {
          const existsInMain = gamePosts.value.some(p => Number(p.id) === Number(data.post.id))
          const existsInPending = pendingGamePosts.value.some(p => Number(p.id) === Number(data.post.id))
          if (!existsInMain && !existsInPending) {
            pendingGamePosts.value.unshift(data.post)
          }
        } else {
          const existsInMain = moviePosts.value.some(p => Number(p.id) === Number(data.post.id))
          const existsInPending = pendingMoviePosts.value.some(p => Number(p.id) === Number(data.post.id))
          if (!existsInMain && !existsInPending) {
            pendingMoviePosts.value.unshift(data.post)
          }
        }
      })
      .listen('.PostLiked', (data: { post_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        if (currentUserId && data.user_id === currentUserId) return
        const updateLikes = (list: Post[]) => {
          const target = list.find(p => Number(p.id) === Number(data.post_id))
          if (target) {
            target.likes_count = data.likes_count
          }
        }
        updateLikes(moviePosts.value)
        updateLikes(gamePosts.value)
        updateLikes(pendingMoviePosts.value)
        updateLikes(pendingGamePosts.value)
      })
      .listen('.PostDeleted', (data: { id: number }) => {
        removePostLocally(data.id)
      })
      .listen('.CommentCreated', (data: { post_id: number; comment: PostComment; comments_count: number }) => {
        const updateComments = (list: Post[]) => {
          const target = list.find(p => p.id === data.post_id)
          if (target) {
            target.comments_count = data.comments_count
            if (!target.comments) target.comments = []
            const existsIndex = target.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
            if (existsIndex === -1) {
              target.comments.push(data.comment)
            } else {
              target.comments[existsIndex] = data.comment
            }
          }
        }
        updateComments(moviePosts.value)
        updateComments(gamePosts.value)
      })
      .listen('.CommentUpdated', (data: { post_id: number; comment: PostComment }) => {
        const updateComments = (list: Post[]) => {
          const target = list.find(p => p.id === data.post_id)
          if (target && target.comments) {
            const existsIndex = target.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
            if (existsIndex !== -1) {
              target.comments[existsIndex] = data.comment
            }
          }
        }
        updateComments(moviePosts.value)
        updateComments(gamePosts.value)
      })
      .listen('.CommentDeleted', (data: { comment_id: number; post_id: number; comments_count: number }) => {
        const updateComments = (list: Post[]) => {
          const target = list.find(p => p.id === data.post_id)
          if (target) {
            target.comments_count = data.comments_count
            if (target.comments) {
              target.comments = target.comments.filter(c => Number(c.id) !== Number(data.comment_id))
            }
          }
        }
        updateComments(moviePosts.value)
        updateComments(gamePosts.value)
      })
      .listen('.CommentLiked', (data: { post_id: number; comment_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        if (currentUserId && data.user_id === currentUserId) return
        const updateCommentLikes = (list: Post[]) => {
          const target = list.find(p => p.id === data.post_id)
          if (target && target.comments) {
            const comment = target.comments.find(c => Number(c.id) === Number(data.comment_id))
            if (comment) {
              comment.likes_count = data.likes_count
            }
          }
        }
        updateCommentLikes(moviePosts.value)
        updateCommentLikes(gamePosts.value)
      })
  }

  function unsubscribeFromEntertainment() {
    if (!isSubscribed) return
    try {
      const echo = connectEcho()
      const channel = echo.channel('posts')
      channel.stopListening('.PostCreated')
      channel.stopListening('.PostLiked')
      channel.stopListening('.PostDeleted')
      channel.stopListening('.CommentCreated')
      channel.stopListening('.CommentLiked')
    } catch {}
    isSubscribed = false
  }

  return {
    posts,
    moviePosts,
    gamePosts,
    isLoading,
    isLoadingMore,
    currentPage,
    lastPage,
    hasLoaded,
    hasMorePages,
    activeTab,
    pendingPosts,
    pendingCount,
    activeFilters,
    isFiltered,
    fetchEntertainmentPosts,
    loadMorePosts,
    setActiveTab,
    flushPendingPosts,
    addPost,
    toggleLike,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
    deletePost,
    removePostLocally,
    subscribeToEntertainment,
    unsubscribeFromEntertainment,
  }
})
