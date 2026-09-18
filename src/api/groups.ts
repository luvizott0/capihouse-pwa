import apiClient from './client'
import type { Group, GroupMessage, User } from '@/types/models'

export function getGroups(params?: { my_groups?: boolean; page?: number; search?: string; date?: string; user_id?: number }) {
  return apiClient.get<{ data: Group[]; current_page: number; last_page: number }>('/groups', { params })
}

export function getGroup(id: number) {
  return apiClient.get<Group>(`/groups/${id}`)
}

export function createGroup(formData: FormData) {
  return apiClient.post<Group>('/groups', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateGroup(id: number, formData: FormData) {
  return apiClient.post<Group>(`/groups/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteGroup(id: number) {
  return apiClient.delete<{ message: string }>(`/groups/${id}`)
}

export function inviteUsers(groupId: number, userIds: number[]) {
  return apiClient.post<{ message: string }>(`/groups/${groupId}/invite`, { user_ids: userIds })
}

export function acceptInvite(groupId: number) {
  return apiClient.post<{ message: string; group: Group }>(`/groups/${groupId}/accept-invite`)
}

export function declineInvite(groupId: number) {
  return apiClient.post<{ message: string }>(`/groups/${groupId}/decline-invite`)
}

export function leaveGroup(groupId: number) {
  return apiClient.post<{ message: string }>(`/groups/${groupId}/leave`)
}

export function getGroupMembers(groupId: number) {
  return apiClient.get<User[]>(`/groups/${groupId}/members`)
}

export function getGroupMessages(groupId: number, sinceId?: number) {
  return apiClient.get<GroupMessage[]>(`/groups/${groupId}/messages`, {
    params: sinceId ? { since_id: sinceId } : undefined,
  })
}

export function sendGroupMessage(groupId: number, content: string) {
  return apiClient.post<GroupMessage>(`/groups/${groupId}/messages`, { content })
}

export function updateGroupMessage(groupId: number, messageId: number, content: string) {
  return apiClient.put<GroupMessage>(`/groups/${groupId}/messages/${messageId}`, { content })
}

export function deleteGroupMessage(groupId: number, messageId: number) {
  return apiClient.delete<GroupMessage>(`/groups/${groupId}/messages/${messageId}`)
}

export function markGroupAsRead(groupId: number) {
  return apiClient.post<{ message: string; unread_messages_count: number }>(`/groups/${groupId}/read`)
}

