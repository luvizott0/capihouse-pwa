import client from './client'
import type { User } from '@/types/models'

export interface ConnectXboxResponse {
  message: string
  user: User
}

export interface DisconnectXboxResponse {
  message: string
  user: User
}

export interface SyncXboxResponse {
  message: string
  user?: User
}

export const connectXbox = (gamertag: string) =>
  client.post<ConnectXboxResponse>('/profile/xbox/connect', { gamertag })

export const disconnectXbox = () =>
  client.post<DisconnectXboxResponse>('/profile/xbox/disconnect')

export const syncXbox = () =>
  client.post<SyncXboxResponse>('/profile/xbox/sync')
