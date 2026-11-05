import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User, Interest, UserTheme } from '@/types/models'
import * as profileApi from '@/api/profile'
import * as interestsApi from '@/api/interests'
import { useAuthStore } from './auth'
import { useThemeStore } from './theme'

const PROFILE_CACHE_PREFIX = 'capihouse_profile_cache_'

function getProfileCacheKey(username?: string): string {
  return username ? `${PROFILE_CACHE_PREFIX}${username}` : `${PROFILE_CACHE_PREFIX}me`
}

function loadProfileFromCache(username?: string): User | null {
  try {
    const stored = localStorage.getItem(getProfileCacheKey(username))
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

function saveProfileToCache(user: User, username?: string) {
  try {
    localStorage.setItem(getProfileCacheKey(username), JSON.stringify(user))
  } catch {}
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<User | null>(null)
  const interests = ref<Interest[]>([])
  const isEditing = ref(false)
  const isLoading = ref(false)
  const authStore = useAuthStore()
  const themeStore = useThemeStore()
  function resetProfile() {
    profile.value = null
    interests.value = []
    isLoading.value = false
  }

  async function fetchProfile(username?: string) {
    if (username && profile.value?.username !== username) {
      profile.value = null
    }

    // Se for o usuário autenticado ou se houver cache local, preenche imediatamente para uso offline
    const isCurrentUser = !username || (authStore.user && username === authStore.user.username)
    if (isCurrentUser && authStore.user) {
      profile.value = authStore.user
    } else {
      const cached = loadProfileFromCache(username)
      if (cached) {
        profile.value = cached
      }
    }

    isLoading.value = true
    try {
      const res = await profileApi.getProfile(username)
      const data = (res.data as any)?.data || res.data
      profile.value = data
      saveProfileToCache(data, username)
      if (!username && authStore.user) {
        authStore.updateUser(data)
      }
    } catch (err) {
      // Se a rede falhar e já temos dados locais, mantemos sem quebrar a tela
      if (profile.value) {
        return
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data: any) {
    isLoading.value = true
    try {
      const res = await profileApi.updateProfile(data)
      const user = (res.data as any)?.data || res.data
      profile.value = user
      if (authStore.user?.id === user.id) {
        authStore.updateUser(user)
      }
    } finally {
      isLoading.value = false
    }
  }

  async function uploadAvatar(file: File | Blob) {
    const formData = new FormData()
    formData.append('avatar', file, 'avatar.jpg')
    const res = await profileApi.uploadAvatar(formData)
    const media = (res.data as any)?.data || res.data
    const newUrl = media.url || media.path
    if (profile.value) profile.value.avatar_url = newUrl
    if (authStore.user) {
      authStore.user.avatar_url = newUrl
      authStore.updateUser(authStore.user)
    }
  }

  async function uploadBanner(file: File | Blob) {
    const formData = new FormData()
    formData.append('banner', file, 'banner.jpg')
    const res = await profileApi.uploadBanner(formData)
    const media = (res.data as any)?.data || res.data
    const newUrl = media.url || media.path
    if (profile.value) profile.value.banner_url = newUrl
    if (authStore.user) {
      authStore.user.banner_url = newUrl
      authStore.updateUser(authStore.user)
    }
  }

  async function syncInterests(interestNames: (string | number)[]) {
    await interestsApi.syncInterests(interestNames)
    await fetchProfile()
  }

  async function updatePassword(data: any) {
    await profileApi.updatePassword(data)
  }

  async function updateTheme(theme: UserTheme) {
    await updateProfile({ theme })
    themeStore.applyTheme(theme)
  }

  async function uploadThemeBackground(file: File) {
    const formData = new FormData()
    formData.append('background', file)
    const res = await profileApi.uploadThemeBackground(formData)
    const data = (res.data as any)?.data || res.data
    return data.url as string
  }

  async function resetProfileTheme() {
    isLoading.value = true
    try {
      const res = await profileApi.resetTheme()
      const user = (res.data as any)?.data || res.data
      profile.value = user
      if (authStore.user?.id === user.id) {
        authStore.updateUser(user)
      }
      themeStore.resetTheme()
    } finally {
      isLoading.value = false
    }
  }

  return {
    profile,
    interests,
    isEditing,
    isLoading,
    resetProfile,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    uploadBanner,
    syncInterests,
    updatePassword,
    updateTheme,
    uploadThemeBackground,
    resetProfileTheme,
  }
})
