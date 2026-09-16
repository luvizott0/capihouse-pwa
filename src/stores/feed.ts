import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Post } from '@/types/models'
import * as postsApi from '@/api/posts'
import { connectEcho } from '@/services/echo'

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(1)

  const activeGroupId = ref<number | undefined>(undefined)

  /** Holds incoming posts that haven't been prepended yet (shown via banner). */
  const pendingPosts = ref<Post[]>([])

  async function fetchPosts(page = 1, groupId?: number) {
    isLoading.value = true
    if (groupId !== undefined) {
      activeGroupId.value = groupId || undefined
    }
    const targetGroupId = groupId !== undefined ? (groupId || undefined) : activeGroupId.value
    try {
      const res = await postsApi.getPosts(page, targetGroupId)
      if (page === 1) {
        posts.value = res.data.data
      } else {
        posts.value.push(...res.data.data)
      }
      currentPage.value = res.data.current_page
      lastPage.value = res.data.last_page
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
      return res.data
    } finally {
      isSubmitting.value = false
    }
  }

  async function toggleLike(postId: number) {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return

    // Optimistic update
    const previousLiked = post.is_liked
    const previousCount = post.likes_count

    post.is_liked = !post.is_liked
    post.likes_count += post.is_liked ? 1 : -1

    try {
      const res = await postsApi.toggleLike(postId)
      post.is_liked = res.data.is_liked
      post.likes_count = res.data.likes_count
    } catch {
      // Revert if error
      post.is_liked = previousLiked
      post.likes_count = previousCount
    }
  }

  async function addComment(postId: number, content: string) {
    const post = posts.value.find(p => p.id === postId)
    const res = await postsApi.addComment(postId, content)
    if (post) {
      if (!post.comments) post.comments = []
      post.comments.push(res.data)
      post.comments_count = (post.comments_count || 0) + 1
    }
    return res.data
  }

  async function deletePost(postId: number) {
    await postsApi.deletePost(postId)
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  async function updatePost(postId: number, data: { content?: string | null, feeling_name?: string, feeling_emoji?: string, hashtags?: string[] }) {
    isSubmitting.value = true
    try {
      const res = await postsApi.updatePost(postId, data)
      const index = posts.value.findIndex(p => p.id === postId)
      if (index !== -1) {
        posts.value[index] = res.data
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
        const index = posts.value.findIndex(p => p.id === data.post.id)
        const target = posts.value[index]
        if (index !== -1 && target) {
          // Preserve client-side is_liked if not present in broadcast payload
          const currentIsLiked = target.is_liked
          posts.value[index] = { ...data.post, is_liked: data.post.is_liked ?? currentIsLiked }
        }
      })
      .listen('.PostDeleted', (data: { id: number }) => {
        posts.value = posts.value.filter(p => p.id !== data.id)
        pendingPosts.value = pendingPosts.value.filter(p => p.id !== data.id)
      })
      .listen('.PostLiked', (data: { post_id: number; is_liked: boolean; likes_count: number; user_id: number }) => {
        // Only update counts for posts from other users (own post is already optimistically updated)
        if (data.user_id === currentUserId) return
        const post = posts.value.find(p => p.id === data.post_id)
        if (post) {
          post.likes_count = data.likes_count
        }
      })
      .listen('.CommentCreated', (data: { post_id: number; comment: any; comments_count: number }) => {
        const post = posts.value.find(p => p.id === data.post_id)
        if (post) {
          post.comments_count = data.comments_count
          if (post.comments) {
            const exists = post.comments.some(c => c.id === data.comment.id)
            if (!exists) {
              post.comments.push(data.comment)
            }
          }
        }
      })
      .listen('.CommentDeleted', (data: { comment_id: number; post_id: number; comments_count: number }) => {
        const post = posts.value.find(p => p.id === data.post_id)
        if (post) {
          post.comments_count = data.comments_count
          if (post.comments) {
            post.comments = post.comments.filter(c => c.id !== data.comment_id)
          }
        }
      })
  }

  function unsubscribeFromFeed(groupId?: number) {
    const echo = connectEcho()
    const channelName = groupId ? `group.${groupId}` : 'posts'
    echo.leave(channelName)
  }

  return {
    posts,
    isLoading,
    isSubmitting,
    currentPage,
    lastPage,
    activeGroupId,
    pendingPosts,
    fetchPosts,
    createPost,
    updatePost,
    toggleLike,
    addComment,
    deletePost,
    flushPendingPosts,
    subscribeToFeed,
    unsubscribeFromFeed,
  }
})

