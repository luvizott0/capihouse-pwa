import client from './client'
import type { User } from '@/types/models'
import type { PaginatedResponse, LoginResponse } from '@/types/api'

export const getUsers = (params: any) => client.get<PaginatedResponse<User>>('/admin/users', { params })
export const approveUser = (id: number) => client.post(`/admin/users/${id}/approve`)
export const rejectUser = (id: number) => client.post(`/admin/users/${id}/reject`)
export const banUser = (id: number) => client.post(`/admin/users/${id}/ban`)
export const unbanUser = (id: number) => client.post(`/admin/users/${id}/unban`)
export const promoteUser = (id: number) => client.post(`/admin/users/${id}/promote`)
export const demoteUser = (id: number) => client.post(`/admin/users/${id}/demote`)
export const deleteUser = (id: number) => client.delete(`/admin/users/${id}`)
export const impersonateUser = (id: number) => client.post<LoginResponse>(`/admin/users/${id}/impersonate`)
