import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/models'
import * as usersApi from '@/api/users'

export const useUsersStore = defineStore('users', () => {
  const onlineUsers = ref<User[]>([])
  const isLoading = ref(false)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function fetchOnlineUsers() {
    isLoading.value = true
    try {
      const res = await usersApi.getOnlineUsers()
      onlineUsers.value = res.data
    } finally {
      isLoading.value = false
    }
  }

  function startPolling() {
    fetchOnlineUsers()
    if (!pollInterval) {
      pollInterval = setInterval(fetchOnlineUsers, 30000)
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    onlineUsers,
    isLoading,
    fetchOnlineUsers,
    startPolling,
    stopPolling
  }
})
