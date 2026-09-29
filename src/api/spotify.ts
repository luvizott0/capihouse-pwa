import apiClient from './client'
import type { User, SpotifyTrack, SpotifyNowPlaying } from '@/types/models'

/**
 * Obtém a URL para autorização com o Spotify via OAuth 2.0.
 */
export async function getSpotifyAuthUrl() {
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined
  return apiClient.get<{ url: string }>('/spotify/auth-url', {
    params: origin ? { frontend_url: origin } : {}
  })
}

/**
 * Desconecta a conta do Spotify do usuário logado.
 */
export async function disconnectSpotify() {
  return apiClient.post<{ message: string; user: User }>('/spotify/disconnect')
}

/**
 * Pesquisa faixas no Spotify por título ou artista.
 */
export async function searchSpotifyTracks(query: string) {
  return apiClient.get<{ tracks: SpotifyTrack[] }>('/spotify/search', {
    params: { q: query }
  })
}

/**
 * Atualiza a música favorita fixada no perfil do usuário.
 */
export async function updateFavoriteMusic(track: SpotifyTrack) {
  return apiClient.put<{ message: string; user: User }>('/profile/favorite-music', track)
}

/**
 * Remove a música favorita fixada no perfil do usuário.
 */
export async function removeFavoriteMusic() {
  return apiClient.delete<{ message: string; user: User }>('/profile/favorite-music')
}

/**
 * Obtém o status do que o usuário está ouvindo no momento no Spotify.
 */
export async function getUserSpotifyStatus(username: string) {
  return apiClient.get<SpotifyNowPlaying>(`/users/${username}/spotify-status`)
}

/**
 * Publica uma música do Spotify como post no feed.
 */
export async function repostSpotifyTrack(payload: {
  track: SpotifyTrack
  content?: string
  feeling_name?: string
  feeling_emoji?: string
  hashtags?: string[]
  from_user?: string
}) {
  return apiClient.post<{ message: string; post: any }>('/spotify/repost', payload)
}
