import apiClient from './client'

export function getPosts(page = 1, groupId?: number) {
  const params: Record<string, unknown> = { page }
  if (groupId) params.group_id = groupId
  return apiClient.get('/posts', { params })
}

export function createPost(formData: FormData) {
  return apiClient.post('/posts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function deletePost(postId: number) {
  return apiClient.delete(`/posts/${postId}`)
}

export function updatePost(postId: number, data: { content?: string | null, feeling_name?: string, feeling_emoji?: string, hashtags?: string[] }) {
  return apiClient.put(`/posts/${postId}`, data)
}

export function toggleLike(postId: number) {
  return apiClient.post(`/posts/${postId}/like`)
}

export function addComment(postId: number, content: string) {
  return apiClient.post(`/posts/${postId}/comments`, { content })
}

export function deleteComment(commentId: number) {
  return apiClient.delete(`/comments/${commentId}`)
}
