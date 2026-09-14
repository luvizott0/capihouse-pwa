export interface User {
  id: number
  name: string
  username: string
  email: string
  avatar_url: string | null
  banner_url: string | null
  status: 'approved' | 'pending' | 'rejected' | 'banned'
  role: 'user' | 'admin'
  bio: string | null
  birth: string | null
  instagram: string | null
  spotify: string | null
  initials: string
  is_admin: boolean
  is_online: boolean
  avatar: Media | null
  banner: Media | null
  interests: Interest[]
  created_at: string
}

export interface Media {
  id: number
  path: string
  type: 'image' | 'video' | 'audio' | 'document'
  collection_name: string | null
  url: string
}

export interface Interest {
  id: number
  name: string
}

export interface Feeling {
  id: number
  post_id: number
  name: string
  emoji: string
}

export interface Hashtag {
  id: number
  name: string
}

export interface PostComment {
  id: number
  post_id: number
  user_id: number
  content: string
  user: User
  created_at: string
}

export interface PostLike {
  id: number
  post_id: number
  user_id: number
}

export interface Post {
  id: number
  user_id: number
  content: string | null
  likes_count: number
  comments_count: number
  created_at: string
  user: User
  media: Media[]
  feeling: Feeling | null
  hashtags: Hashtag[]
  comments: PostComment[]
  likes?: PostLike[]
  is_liked?: boolean
}

export interface EventUser {
  id: number
  event_id: number
  user_id: number
  status: 'invited' | 'confirmed' | 'declined'
}

export interface Event {
  id: number
  name: string
  description: string
  date: string
  user_id: number
  created_at: string
  owner: User
  guests?: User[]
  guests_count?: number
  media?: Media[]
  image_url?: string | null
}
