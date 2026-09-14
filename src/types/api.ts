import type { User } from './models'

export interface LoginRequest {
  login: string
  password: string
  remember?: boolean
}

export interface RegisterRequest {
  name: string
  username: string
  email: string
  password: string
  password_confirmation: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
