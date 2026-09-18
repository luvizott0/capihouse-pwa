export interface UserTheme {
  bg_type: 'color' | 'image'
  bg_value: string
  bg_size?: string
  bg_repeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y'
  bg_position?: string
  color_primary?: string
}

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
  theme?: UserTheme | null
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

export interface PostCommentParent {
  id: number
  content: string
  user_id: number
  user?: {
    id: number
    name: string
    username: string
  }
}

export interface PostComment {
  id: number
  post_id: number
  parent_id?: number | null
  parent?: PostCommentParent | null
  user_id: number
  content: string
  user: User
  mentions?: User[]
  likes_count?: number
  is_liked?: boolean
  created_at: string
  updated_at?: string
}

export interface PostLike {
  id: number
  post_id: number
  user_id: number
}

export interface Post {
  id: number
  user_id: number
  group_id?: number | null
  group?: { id: number; name: string } | null
  event_id?: number | null
  event?: { id: number; name: string } | null
  content: string | null
  likes_count: number
  comments_count: number
  created_at: string
  user: User
  media: Media[]
  feeling: Feeling | null
  hashtags: Hashtag[]
  mentions?: User[]
  comments: PostComment[]
  likes?: PostLike[]
  is_liked?: boolean
}

export interface Group {
  id: number
  name: string
  description: string | null
  creator_id: number
  creator?: User
  image_url: string | null
  members_count: number
  is_member: boolean
  membership_status: 'pending' | 'accepted' | 'declined' | null
  my_role: 'owner' | 'admin' | 'member' | null
  accepted_members?: User[]
  unread_messages_count?: number
  created_at: string
}

export interface GroupMessage {
  id: number
  group_id: number
  user_id: number
  content: string
  user: User
  created_at: string
  edited_at?: string | null
  deleted_at?: string | null
  is_edited?: boolean
  is_deleted?: boolean
}

export interface AppNotification {
  id: number
  user_id: number
  type: string
  title: string
  content: string | null
  data?: {
    group_id?: number
    group_name?: string
    inviter_id?: number
    inviter_name?: string
    status?: 'pending' | 'accepted' | 'declined'
    post_id?: number
    comment_id?: number
    liker_id?: number
    liker_name?: string
    commenter_id?: number
    commenter_name?: string
    [key: string]: unknown
  } | null
  read_at: string | null
  created_at: string
}

export interface EventUser {
  id: number
  event_id: number
  user_id: number
  status: 'invited' | 'confirmed' | 'declined'
}

export interface EventGuest extends User {
  pivot?: {
    event_id: number
    user_id: number
    status: 'invited' | 'confirmed' | 'declined'
  }
}

export interface Event {
  id: number
  name: string
  description: string
  date: string
  user_id: number
  created_at: string
  owner: User
  guests?: EventGuest[]
  guests_count?: number
  media?: Media[]
  image_url?: string | null
}

export interface NotificationPreferences {
  likes: boolean
  comments: boolean
  mentions: boolean
  group_invites: boolean
  event_invites: boolean
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  content_encoding?: string
}

