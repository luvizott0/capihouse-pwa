import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/models'
import * as usersApi from '@/api/users'
import { connectEcho } from '@/services/echo'

export const useUsersStore = defineStore('users', () => {
  const allUsers = ref<User[]>([])
  const onlineUsers = ref<User[]>([])
  const isLoading = ref(false)
  const isChannelJoined = ref(false)
  const presenceUserIds = ref<Set<number>>(new Set())

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let isListeningVisibility = false

  function applyPresence() {
    if (presenceUserIds.value.size === 0) {
      onlineUsers.value = allUsers.value.filter(u => u.is_online)
      return
    }

    allUsers.value.forEach(user => {
      user.is_online = presenceUserIds.value.has(user.id)
    })
    onlineUsers.value = allUsers.value.filter(u => u.is_online)
  }

  async function fetchUsers() {
    isLoading.value = true
    try {
      const res = await usersApi.getUsers()
      const data = (((res.data as unknown as Record<string, unknown>)?.data || res.data) as User[]) || []
      allUsers.value = data
      applyPresence()
    } catch {
      // Silent
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOnlineUsers() {
    isLoading.value = true
    try {
      const res = await usersApi.getOnlineUsers()
      const data = (((res.data as unknown as Record<string, unknown>)?.data || res.data) as User[]) || []
      onlineUsers.value = data
    } catch {
      // Silent
    } finally {
      isLoading.value = false
    }
  }

  function joinPresenceChannel() {
    if (typeof window === 'undefined') return
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('capihouse_token') : null
    if (!token) return

    try {
      const echo = connectEcho()
      echo.join('online')
        .here((users: Array<{ id: number; name: string; username: string }>) => {
          isChannelJoined.value = true
          presenceUserIds.value = new Set(users.map(u => u.id))
          applyPresence()
        })
        .joining((user: { id: number; name: string; username: string }) => {
          presenceUserIds.value.add(user.id)
          const target = allUsers.value.find(u => u.id === user.id)
          if (target) {
            target.is_online = true
          }
          applyPresence()
        })
        .leaving((user: { id: number; name: string; username: string }) => {
          presenceUserIds.value.delete(user.id)
          const target = allUsers.value.find(u => u.id === user.id)
          if (target) {
            target.is_online = false
          }
          applyPresence()
        })
    } catch {
      // Falha silenciosa
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      usersApi.sendHeartbeat().catch(() => {})
      fetchUsers()
      if (!isChannelJoined.value) {
        joinPresenceChannel()
      }
    }
  }

  function handleOnlineStatus() {
    if (navigator.onLine) {
      usersApi.sendHeartbeat().catch(() => {})
      fetchUsers()
      joinPresenceChannel()
    }
  }

  function startPolling() {
    fetchUsers()
    joinPresenceChannel()
    usersApi.sendHeartbeat().catch(() => {})

    if (!heartbeatInterval && typeof window !== 'undefined') {
      heartbeatInterval = setInterval(() => {
        usersApi.sendHeartbeat().catch(() => {})
        fetchUsers()
      }, 30000)
    }

    if (!isListeningVisibility && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('online', handleOnlineStatus)
      isListeningVisibility = true
    }
  }

  function stopPolling() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
    if (isListeningVisibility && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnlineStatus)
      isListeningVisibility = false
    }
  }

  return {
    allUsers,
    onlineUsers,
    isLoading,
    isChannelJoined,
    presenceUserIds,
    fetchUsers,
    fetchOnlineUsers,
    joinPresenceChannel,
    startPolling,
    stopPolling,
  }
})
