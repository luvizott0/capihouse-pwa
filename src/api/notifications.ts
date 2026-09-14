import apiClient from './client'
import type { AppNotification } from '@/types/models'

export function getNotifications(page = 1) {
  return apiClient.get<{ data: AppNotification[]; current_page: number; last_page: number; total: number }>(`/notifications?page=${page}`)
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
