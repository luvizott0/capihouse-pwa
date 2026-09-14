import client from './client'
import type { LoginRequest, RegisterRequest, LoginResponse } from '@/types/api'
import type { User } from '@/types/models'

export const login = (data: LoginRequest) => client.post<LoginResponse>('/auth/login', data)
export const register = (data: RegisterRequest) => client.post('/auth/register', data)
export const logout = () => client.post('/auth/logout')
export const getMe = () => client.get<User>('/auth/me')
export const impersonate = (data: { user_id?: number; login?: string }) =>
  client.post<LoginResponse>('/auth/impersonate', data)
export const getDevUsers = () => client.get<{ users: User[] }>('/auth/dev-users')

