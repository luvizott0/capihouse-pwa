import client from './client'
import type { Post } from '@/types/models'

export interface CreateGameReviewPayload {
  game_title: string
  platform?: string
  game_status?: 'playing' | 'completed' | 'mastered' | 'dropped' | 'wishlist'
  rating?: number | null
  content?: string | null
  box_art_url?: string | null
  box_art?: File | null
  hours_played?: number | null
}

export interface CreateGameReviewResponse {
  message: string
  post: Post
}

export const createGameReview = (payload: CreateGameReviewPayload | FormData) => {
  if (payload instanceof FormData) {
    return client.post<CreateGameReviewResponse>('/entertainment/games', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  }

  const formData = new FormData()
  formData.append('game_title', payload.game_title)
  if (payload.platform) formData.append('platform', payload.platform)
  if (payload.game_status) formData.append('game_status', payload.game_status)
  if (payload.rating != null) formData.append('rating', String(payload.rating))
  if (payload.content) formData.append('content', payload.content)
  if (payload.box_art_url) formData.append('box_art_url', payload.box_art_url)
  if (payload.box_art) formData.append('box_art', payload.box_art)
  if (payload.hours_played != null) formData.append('hours_played', String(payload.hours_played))

  return client.post<CreateGameReviewResponse>('/entertainment/games', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export interface GameSearchResult {
  id: string
  title: string
  cover_url: string | null
  source?: string
}

export const searchGames = (q: string) => {
  return client.get<{ data: GameSearchResult[] }>('/entertainment/games/search', {
    params: { q },
  })
}

