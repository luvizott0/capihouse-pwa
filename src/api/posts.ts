import apiClient from './client'

export interface GetPostsParams {
  page?: number
  groupId?: number
  search?: string
  date?: string
  userId?: number
}

export function getPosts(paramsOrPage: number | GetPostsParams = 1, groupId?: number) {
  const params: Record<string, unknown> = {}
  if (typeof paramsOrPage === 'number') {
    params.page = paramsOrPage
    if (groupId) params.group_id = groupId
  } else {
    if (paramsOrPage.page) params.page = paramsOrPage.page
    if (paramsOrPage.groupId) params.group_id = paramsOrPage.groupId
    if (paramsOrPage.search) params.search = paramsOrPage.search
    if (paramsOrPage.date) params.date = paramsOrPage.date
    if (paramsOrPage.userId) params.user_id = paramsOrPage.userId
  }
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

export function updateComment(commentId: number, content: string) {
  return apiClient.put(`/comments/${commentId}`, { content })
}

export function deleteComment(commentId: number) {
  return apiClient.delete(`/comments/${commentId}`)
}
