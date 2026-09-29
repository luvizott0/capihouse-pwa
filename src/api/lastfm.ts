import apiClient from './client'
import type { User } from '@/types/models'

/**
 * Conecta a conta do Last.fm ao perfil do usuário.
 */
export async function connectLastfm(username: string) {
  return apiClient.post<{ message: string; user: User }>('/profile/lastfm/connect', { username })
}

/**
 * Desconecta a conta do Last.fm do usuário logado.
 */
export async function disconnectLastfm() {
  return apiClient.post<{ message: string; user: User }>('/profile/lastfm/disconnect')
}
