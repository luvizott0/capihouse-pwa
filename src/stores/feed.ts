import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Post } from '@/types/models'
import * as postsApi from '@/api/posts'

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(1)

  async function fetchPosts(page = 1) {
    isLoading.value = true
    try {
      const res = await postsApi.getPosts(page)
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

  return {
    posts,
    isLoading,
    isSubmitting,
    currentPage,
    lastPage,
    fetchPosts,
    createPost,
    updatePost,
    toggleLike,
    addComment,
    deletePost,
  }
})
