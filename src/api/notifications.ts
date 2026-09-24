import apiClient from './client'
import type { AppNotification } from '@/types/models'

export interface NotificationCategoryCounts {
  all: number
  unread?: number
  likes: number
  comments: number
  mentions: number
  groups: number
  events: number
  polls?: number
}

export function getNotifications(page = 1, category?: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (category && category !== 'all') {
    params.set('category', category)
  }
  return apiClient.get<{ data: AppNotification[]; current_page: number; last_page: number; total: number }>(`/notifications?${params.toString()}`)
}

export function getCategoryCounts() {
  return apiClient.get<NotificationCategoryCounts>('/notifications/category-counts')
}

export function getUnreadCount() {
  return apiClient.get<{ unread_count: number }>('/notifications/unread-count')
}

export function markNotificationAsRead(id: number) {
  return apiClient.patch<AppNotification>(`/notifications/${id}/read`)
}

export function markAllNotificationsAsRead() {
  return apiClient.post<{ message: string }>('/notifications/read-all')
}
