import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Post, PostComment } from '@/types/models'
import * as postsApi from '@/api/posts'
import { connectEcho } from '@/services/echo'

const FEED_CACHE_KEY = 'capihouse_feed_cache'

interface FeedCacheData {
  posts: Post[]
  lastPage: number
}

function loadInitialFeedCache(): FeedCacheData {
  try {
    const stored = localStorage.getItem(FEED_CACHE_KEY)
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

function saveFeedCache(data: Post[], lastPage: number) {
  try {
    // Mantém no máximo 15 posts no storage local para ser leve e rápido
    localStorage.setItem(
      FEED_CACHE_KEY,
      JSON.stringify({
        posts: data.slice(0, 15),
        lastPage,
      })
    )
  } catch {}
}

export const useFeedStore = defineStore('feed', () => {
  const initialCache = loadInitialFeedCache()
  const posts = ref<Post[]>(initialCache.posts)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const isSubmitting = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(initialCache.lastPage)
  const hasLoaded = ref(false)

  const hasMorePages = computed(() => currentPage.value < lastPage.value)

  const activeGroupId = ref<number | undefined>(undefined)

  /** Holds incoming posts that haven't been prepended yet (shown via banner). */
  const pendingPosts = ref<Post[]>([])

  const activeFilters = ref<{ search?: string; date?: string; userId?: number }>({})
  const isFiltered = ref(false)

  // Profile-specific posts to avoid polluting the main feed
  const userPosts = ref<Post[]>([])
  const isLoadingUserPosts = ref(false)
  const isLoadingMoreUserPosts = ref(false)
  const userPostsCurrentPage = ref(1)
  const userPostsLastPage = ref(1)
  const hasMoreUserPosts = computed(() => userPostsCurrentPage.value < userPostsLastPage.value)
  const activeProfileUserId = ref<number | null>(null)

  async function fetchPosts(
    page = 1,
    options?: { groupId?: number; search?: string; date?: string; userId?: number; forceRefresh?: boolean } | number
  ) {
    if (page > 1) {
      isLoadingMore.value = true
    } else {
      // Se já temos posts do cache, não bloqueia a tela inteira com spinner
      isLoading.value = true
    }

    let groupId: number | undefined
    if (typeof options === 'number') {
      groupId = options
    } else if (options) {
      groupId = options.groupId
      activeFilters.value = {
        search: options.search || undefined,
        date: options.date || undefined,
        userId: options.userId || undefined,
      }
    } else if (page === 1) {
      activeFilters.value = {}
    }

    if (groupId !== undefined) {
      activeGroupId.value = groupId || undefined
    }
    const targetGroupId = groupId !== undefined ? (groupId || undefined) : activeGroupId.value

    const hasAnyFilter = Boolean(
      targetGroupId ||
      activeFilters.value.search ||
      activeFilters.value.date ||
      activeFilters.value.userId
    )

    try {
      const res = await postsApi.getPosts({
        page,
        groupId: targetGroupId,
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        userId: activeFilters.value.userId,
      })
      currentPage.value = res.data.current_page
      lastPage.value = res.data.last_page
      hasLoaded.value = true

      if (page === 1) {
        posts.value = res.data.data
        isFiltered.value = hasAnyFilter
        // Salva no cache local offline-first apenas se for o feed geral sem filtros
        if (!hasAnyFilter) {
          saveFeedCache(res.data.data, res.data.last_page)
        }
      } else {
        // Evita duplicatas caso algum post já tenha chegado via WebSocket
        const existingIds = new Set(posts.value.map(p => p.id))
        const newUniquePosts = res.data.data.filter((p: Post) => !existingIds.has(p.id))
        posts.value.push(...newUniquePosts)
      }
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMorePosts() {
    if (isLoading.value || isLoadingMore.value || !hasMorePages.value) return
    await fetchPosts(currentPage.value + 1)
  }

  async function fetchUserPosts(userId: number, page = 1) {
    if (page > 1) {
      isLoadingMoreUserPosts.value = true
    } else {
      isLoadingUserPosts.value = true
      activeProfileUserId.value = userId
    }

    try {
      const res = await postsApi.getPosts({
        page,
        userId,
      })
      if (page === 1) {
        userPosts.value = res.data.data
      } else {
        const existingIds = new Set(userPosts.value.map(p => p.id))
        const newUniquePosts = res.data.data.filter((p: Post) => !existingIds.has(p.id))
        userPosts.value.push(...newUniquePosts)
      }
      userPostsCurrentPage.value = res.data.current_page
      userPostsLastPage.value = res.data.last_page
      return res.data
    } finally {
      isLoadingUserPosts.value = false
      isLoadingMoreUserPosts.value = false
    }
  }

  async function loadMoreUserPosts() {
    if (isLoadingUserPosts.value || isLoadingMoreUserPosts.value || !hasMoreUserPosts.value || !activeProfileUserId.value) return
    await fetchUserPosts(activeProfileUserId.value, userPostsCurrentPage.value + 1)
  }

  function clearFilters() {
    activeFilters.value = {}
  }

  async function fetchSinglePost(postId: number) {
    isLoading.value = true
    try {
      const res = await postsApi.getPost(postId)
      const existingIndex = posts.value.findIndex(p => p.id === postId)
      if (existingIndex !== -1) {
        posts.value[existingIndex] = res.data
      } else {
        posts.value.push(res.data)
      }
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function createPost(formData: FormData) {
    isSubmitting.value = true
    try {
      const res = await postsApi.createPost(formData)
      // The server will broadcast PostCreated; we still add it locally for
      // the author so they see their own post immediately without waiting for the WS event.
      posts.value.unshift(res.data)
      if (activeProfileUserId.value && res.data.user_id === activeProfileUserId.value) {
        userPosts.value.unshift(res.data)
      }
      return res.data
    } finally {
      isSubmitting.value = false
    }
  }

  async function toggleLike(postId: number) {
    const postInFeed = posts.value.find(p => p.id === postId)
    const postInUser = userPosts.value.find(p => p.id === postId)
    if (!postInFeed && !postInUser) return

    const targetPost = postInFeed || postInUser!
    // Optimistic update
    const previousLiked = targetPost.is_liked
    const previousCount = targetPost.likes_count
    const nextLiked = !previousLiked
    const nextCount = previousCount + (nextLiked ? 1 : -1)

    if (postInFeed) {
      postInFeed.is_liked = nextLiked
      postInFeed.likes_count = nextCount
    }
    if (postInUser) {
      postInUser.is_liked = nextLiked
      postInUser.likes_count = nextCount
    }

    try {
      const res = await postsApi.toggleLike(postId)
      if (postInFeed) {
        postInFeed.is_liked = res.data.is_liked
        postInFeed.likes_count = res.data.likes_count
      }
      if (postInUser) {
        postInUser.is_liked = res.data.is_liked
        postInUser.likes_count = res.data.likes_count
      }
    } catch {
      // Revert if error
      if (postInFeed) {
        postInFeed.is_liked = previousLiked
        postInFeed.likes_count = previousCount
      }
      if (postInUser) {
        postInUser.is_liked = previousLiked
        postInUser.likes_count = previousCount
      }
    }
  }

  async function toggleCommentLike(postId: number, commentId: number) {
    const postInFeed = posts.value.find(p => p.id === postId)
    const postInUser = userPosts.value.find(p => p.id === postId)

    const commentInFeed = postInFeed?.comments?.find(c => Number(c.id) === Number(commentId))
    const commentInUser = postInUser?.comments?.find(c => Number(c.id) === Number(commentId))

    const targetComment = commentInFeed || commentInUser
    if (!targetComment) return

    const prevLiked = !!targetComment.is_liked
    const prevCount = targetComment.likes_count ?? 0
    const nextLiked = !prevLiked
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1))

    if (commentInFeed) {
      commentInFeed.is_liked = nextLiked
      commentInFeed.likes_count = nextCount
    }
    if (commentInUser) {
      commentInUser.is_liked = nextLiked
      commentInUser.likes_count = nextCount
    }

    try {
      const res = await postsApi.toggleCommentLike(commentId)
      if (commentInFeed) {
        commentInFeed.is_liked = res.data.is_liked
        commentInFeed.likes_count = res.data.likes_count
      }
      if (commentInUser) {
        commentInUser.is_liked = res.data.is_liked
        commentInUser.likes_count = res.data.likes_count
      }
    } catch {
      // Revert on error
      if (commentInFeed) {
        commentInFeed.is_liked = prevLiked
        commentInFeed.likes_count = prevCount
      }
      if (commentInUser) {
        commentInUser.is_liked = prevLiked
        commentInUser.likes_count = prevCount
      }
    }
  }

  async function addComment(postId: number, content: string, parentId?: number | null) {
    const postInFeed = posts.value.find(p => p.id === postId)
    const postInUser = userPosts.value.find(p => p.id === postId)
    const res = await postsApi.addComment(postId, content, parentId)

    const applyComment = (post: Post) => {
      if (!post.comments) post.comments = []
      const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(res.data.id))
      if (existsIndex === -1) {
        post.comments.push(res.data)
        post.comments_count = (post.comments_count || 0) + 1
      } else {
        post.comments[existsIndex] = res.data
      }
    }

    if (postInFeed) applyComment(postInFeed)
    if (postInUser) applyComment(postInUser)

    return res.data
  }

  async function updateComment(postId: number, commentId: number, content: string) {
    const res = await postsApi.updateComment(commentId, content)
    const applyUpdate = (post: Post) => {
      if (post && post.comments) {
        const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(commentId))
        if (existsIndex !== -1) {
          post.comments[existsIndex] = res.data
        }
      }
    }
    const postInFeed = posts.value.find(p => p.id === postId)
    const postInUser = userPosts.value.find(p => p.id === postId)
    if (postInFeed) applyUpdate(postInFeed)
    if (postInUser) applyUpdate(postInUser)
    return res.data
  }

  async function deleteComment(postId: number, commentId: number) {
    await postsApi.deleteComment(commentId)
    const applyDelete = (post: Post) => {
      if (post && post.comments) {
        post.comments = post.comments.filter(c => Number(c.id) !== Number(commentId))
        post.comments_count = Math.max(0, (post.comments_count || 1) - 1)
      }
    }
    const postInFeed = posts.value.find(p => p.id === postId)
    const postInUser = userPosts.value.find(p => p.id === postId)
    if (postInFeed) applyDelete(postInFeed)
    if (postInUser) applyDelete(postInUser)
  }

  async function deletePost(postId: number) {
    await postsApi.deletePost(postId)
    posts.value = posts.value.filter(p => p.id !== postId)
    userPosts.value = userPosts.value.filter(p => p.id !== postId)
  }

  async function updatePost(postId: number, data: { content?: string | null, feeling_name?: string, feeling_emoji?: string, hashtags?: string[] }) {
    isSubmitting.value = true
    try {
      const res = await postsApi.updatePost(postId, data)
      const feedIndex = posts.value.findIndex(p => p.id === postId)
      if (feedIndex !== -1) {
        posts.value[feedIndex] = res.data
      }
      const userIndex = userPosts.value.findIndex(p => p.id === postId)
      if (userIndex !== -1) {
        userPosts.value[userIndex] = res.data
      }
      return res.data
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Flush pendingPosts into the main posts list (called when user clicks the banner).
   */
  function flushPendingPosts() {
    posts.value.unshift(...pendingPosts.value)
    pendingPosts.value = []
  }

  /**
   * Subscribe to the public feed channel (and optionally a group channel).
   * @param currentUserId — used to avoid duplicating the author's own posts.
   * @param groupId — when viewing a group feed, subscribe to the group's private channel.
   */
  function subscribeToFeed(currentUserId: number, groupId?: number) {
    const echo = connectEcho()

    const channelName = groupId ? `group.${groupId}` : 'posts'
    const channel = groupId
      ? echo.private(channelName)
      : echo.channel(channelName)

    channel
      .listen('.PostCreated', (data: { post: Post }) => {
        // Don't show banner for the author's own post (already prepended locally)
        if (data.post.user_id === currentUserId) return
        // Only add to pending if not already in the list
        const exists = posts.value.some(p => p.id === data.post.id)
        if (!exists) {
          pendingPosts.value.unshift(data.post)
        }
      })
      .listen('.PostUpdated', (data: { post: Post }) => {
        const updateInList = (list: Post[]) => {
          const index = list.findIndex(p => p.id === data.post.id)
          const target = list[index]
          if (index !== -1 && target) {
            // Preserve client-side is_liked if not present in broadcast payload
            const currentIsLiked = target.is_liked
            list[index] = { ...data.post, is_liked: data.post.is_liked ?? currentIsLiked }
          }
        }
        updateInList(posts.value)
        updateInList(userPosts.value)
      })
      .listen('.PostDeleted', (data: { id: number }) => {
        posts.value = posts.value.filter(p => p.id !== data.id)
        userPosts.value = userPosts.value.filter(p => p.id !== data.id)
        pendingPosts.value = pendingPosts.value.filter(p => p.id !== data.id)
      })
      .listen('.PostLiked', (data: { post_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        // Only update counts for posts from other users (own post is already optimistically updated)
        if (data.user_id === currentUserId) return
        const postInFeed = posts.value.find(p => p.id === data.post_id)
        if (postInFeed) {
          postInFeed.likes_count = data.likes_count
        }
        const postInUser = userPosts.value.find(p => p.id === data.post_id)
        if (postInUser) {
          postInUser.likes_count = data.likes_count
        }
      })
      .listen('.CommentCreated', (data: { post_id: number; comment: PostComment; comments_count: number }) => {
        const updateComments = (post: Post) => {
          post.comments_count = data.comments_count
          if (!post.comments) {
            post.comments = []
          }
          const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
          if (existsIndex === -1) {
            post.comments.push(data.comment)
          } else {
            post.comments[existsIndex] = data.comment
          }
        }
        const postInFeed = posts.value.find(p => p.id === data.post_id)
        if (postInFeed) updateComments(postInFeed)
        const postInUser = userPosts.value.find(p => p.id === data.post_id)
        if (postInUser) updateComments(postInUser)
      })
      .listen('.CommentUpdated', (data: { post_id: number; comment: PostComment }) => {
        const updateComments = (post: Post) => {
          if (post && post.comments) {
            const existsIndex = post.comments.findIndex(c => Number(c.id) === Number(data.comment.id))
            if (existsIndex !== -1) {
              post.comments[existsIndex] = data.comment
            }
          }
        }
        const postInFeed = posts.value.find(p => p.id === data.post_id)
        if (postInFeed) updateComments(postInFeed)
        const postInUser = userPosts.value.find(p => p.id === data.post_id)
        if (postInUser) updateComments(postInUser)
      })
      .listen('.CommentDeleted', (data: { comment_id: number; post_id: number; comments_count: number }) => {
        const updateComments = (post: Post) => {
          if (post) {
            post.comments_count = data.comments_count
            if (post.comments) {
              post.comments = post.comments.filter(c => Number(c.id) !== Number(data.comment_id))
            }
          }
        }
        const postInFeed = posts.value.find(p => p.id === data.post_id)
        if (postInFeed) updateComments(postInFeed)
        const postInUser = userPosts.value.find(p => p.id === data.post_id)
        if (postInUser) updateComments(postInUser)
      })
      .listen('.CommentLiked', (data: { post_id: number; comment_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        if (data.user_id === currentUserId) return
        const updateCommentLikes = (post: Post) => {
          if (!post || !post.comments) return
          const comment = post.comments.find(c => Number(c.id) === Number(data.comment_id))
          if (comment) {
            comment.likes_count = data.likes_count
          }
        }
        const postInFeed = posts.value.find(p => p.id === data.post_id)
        if (postInFeed) updateCommentLikes(postInFeed)
        const postInUser = userPosts.value.find(p => p.id === data.post_id)
        if (postInUser) updateCommentLikes(postInUser)
      })
  }

  function unsubscribeFromFeed(groupId?: number) {
    const echo = connectEcho()
    const channelName = groupId ? `group.${groupId}` : 'posts'
    echo.leave(channelName)
  }

  return {
    posts,
    userPosts,
    isLoading,
    isLoadingMore,
    hasLoaded,
    isLoadingUserPosts,
    isLoadingMoreUserPosts,
    hasMorePages,
    hasMoreUserPosts,
    isSubmitting,
    currentPage,
    lastPage,
    userPostsCurrentPage,
    userPostsLastPage,
    activeGroupId,
    pendingPosts,
    activeFilters,
    isFiltered,
    clearFilters,
    fetchPosts,
    fetchUserPosts,
    loadMorePosts,
    loadMoreUserPosts,
    fetchSinglePost,
    createPost,
    updatePost,
    toggleLike,
    toggleCommentLike,
    addComment,
    updateComment,
    deleteComment,
    deletePost,
    flushPendingPosts,
    subscribeToFeed,
    unsubscribeFromFeed,
  }
})

