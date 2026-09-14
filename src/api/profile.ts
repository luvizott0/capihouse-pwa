import client from './client'
import type { User, Media } from '@/types/models'

export const getProfile = (username?: string) => client.get<User>(username ? `/users/${username}` : '/profile')
export const updateProfile = (data: any) => client.put<User>('/profile', data)
export const uploadAvatar = (formData: FormData) => client.post<Media>('/profile/avatar', formData)
export const uploadBanner = (formData: FormData) => client.post<Media>('/profile/banner', formData)
export const updatePassword = (data: any) => client.put('/profile/password', data)
