import client from './client'
import type { User } from '@/types/models'

export interface ConnectLetterboxdResponse {
  message: string
  user: User
}

export interface DisconnectLetterboxdResponse {
  message: string
  user: User
}

export interface SyncLetterboxdResponse {
  message: string
}

export const connectLetterboxd = (username: string) =>
  client.post<ConnectLetterboxdResponse>('/profile/letterboxd/connect', { username })

export const disconnectLetterboxd = () =>
  client.post<DisconnectLetterboxdResponse>('/profile/letterboxd/disconnect')

export const syncLetterboxd = () =>
  client.post<SyncLetterboxdResponse>('/profile/letterboxd/sync')
