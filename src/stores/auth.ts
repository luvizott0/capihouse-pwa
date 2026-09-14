import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/models'
import type { LoginRequest, RegisterRequest } from '@/types/api'
import * as authApi from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // Restore initial state synchronously from localStorage to prevent flash of unauthenticated state
  const token = ref<string | null>(localStorage.getItem('capihouse_token'))
  const user = ref<User | null>((() => {
    try {
      const cached = localStorage.getItem('capihouse_user')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      // Unwrap if previously stored with { data: ... }
      return parsed && parsed.data ? parsed.data : parsed
    } catch {
      return null
    }
  })())
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => {
    const r = user.value?.role
    return r === 'admin' || (r as any)?.value === 'admin'
  })
  const isApproved = computed(() => {
    const s = user.value?.status
    return s === 'approved' || (s as any)?.value === 'approved'
  })
  const userInitials = computed(() => user.value?.initials || '??')

  function initFromStorage() {
    const storedToken = localStorage.getItem('capihouse_token')
    if (storedToken) {
      token.value = storedToken
      fetchMe()
    }
  }

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken
    const unwrapped = (newUser as any)?.data ? (newUser as any).data : newUser
    user.value = unwrapped
    localStorage.setItem('capihouse_token', newToken)
    localStorage.setItem('capihouse_user', JSON.stringify(unwrapped))
  }

  function updateUser(updatedUser: User) {
    const unwrapped = (updatedUser as any)?.data ? (updatedUser as any).data : updatedUser
    user.value = unwrapped
    localStorage.setItem('capihouse_user', JSON.stringify(unwrapped))
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('capihouse_token')
    localStorage.removeItem('capihouse_user')
  }

  async function login(data: LoginRequest) {
    isLoading.value = true
    try {
      const res = await authApi.login(data)
      const resData = res.data as any
      const rawUser = resData.user || resData.data || resData
      setAuth(resData.token, rawUser)
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function register(data: RegisterRequest) {
    isLoading.value = true
    try {
      await authApi.register(data)
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuth()
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const res = await authApi.getMe()
      const resData = res.data as any
      const userData = (resData && resData.data) ? resData.data : resData
      user.value = userData
      localStorage.setItem('capihouse_user', JSON.stringify(userData))
      return userData
    } catch (err: any) {
      if (err.response?.status === 401) {
        clearAuth()
      }
      return null
    }
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin,
    isApproved,
    userInitials,
    initFromStorage,
    setAuth,
    updateUser,
    clearAuth,
    login,
    register,
    logout,
    fetchMe,
  }
})
