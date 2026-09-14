import client from './client'
import type { User } from '@/types/models'

export const getUser = (username: string) => client.get<User>(`/users/${username}`)
export const getOnlineUsers = () => client.get<User[]>('/users/online')
export const getUsers = (search?: string) => client.get<User[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)
