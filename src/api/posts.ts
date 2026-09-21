import apiClient from './client'
import type { PollVotersResponse } from '@/types/models'

export interface GetPostsParams {
  page?: number
  groupId?: number
  eventId?: number
  search?: string
  date?: string
  startDate?: string
  endDate?: string
  userId?: number
  category?: string
  entertainmentType?: string
}

export function getPosts(paramsOrPage: number | GetPostsParams = 1, groupId?: number) {
  const params: Record<string, unknown> = {}
  if (typeof paramsOrPage === 'number') {
    params.page = paramsOrPage
    if (groupId) params.group_id = groupId
  } else {
    if (paramsOrPage.page) params.page = paramsOrPage.page
    if (paramsOrPage.groupId) params.group_id = paramsOrPage.groupId
    if (paramsOrPage.eventId) params.event_id = paramsOrPage.eventId
    if (paramsOrPage.search) params.search = paramsOrPage.search
    if (paramsOrPage.date) params.date = paramsOrPage.date
    if (paramsOrPage.startDate) params.start_date = paramsOrPage.startDate
    if (paramsOrPage.endDate) params.end_date = paramsOrPage.endDate
    if (paramsOrPage.userId) params.user_id = paramsOrPage.userId
    if (paramsOrPage.category) params.category = paramsOrPage.category
    if (paramsOrPage.entertainmentType) params.entertainment_type = paramsOrPage.entertainmentType
  }
  return apiClient.get('/posts', { params })
}

export function getPost(postId: number) {
  return apiClient.get(`/posts/${postId}`)
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

export function votePoll(postId: number, optionId: number) {
  return apiClient.post(`/posts/${postId}/poll/vote`, { option_id: optionId })
}

export function getPollVoters(postId: number) {
  return apiClient.get<PollVotersResponse>(`/posts/${postId}/poll/voters`)
}

export function toggleCommentLike(commentId: number) {
  return apiClient.post(`/comments/${commentId}/like`)
}

export function addComment(postId: number, content: string, parentId?: number | null) {
  return apiClient.post(`/posts/${postId}/comments`, {
    content,
    parent_id: parentId || undefined,
  })
}

export function updateComment(commentId: number, content: string) {
  return apiClient.put(`/comments/${commentId}`, { content })
}

export function deleteComment(commentId: number) {
  return apiClient.delete(`/comments/${commentId}`)
}
