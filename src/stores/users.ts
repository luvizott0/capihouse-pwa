import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/models'
import * as usersApi from '@/api/users'

export const useUsersStore = defineStore('users', () => {
  const allUsers = ref<User[]>([])
  const onlineUsers = ref<User[]>([])
  const isLoading = ref(false)

  async function fetchUsers() {
    isLoading.value = true
    try {
      const res = await usersApi.getUsers()
      const data = (res.data as any)?.data || res.data
      allUsers.value = data
      onlineUsers.value = data.filter((u: User) => u.is_online)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchOnlineUsers() {
    isLoading.value = true
    try {
      const res = await usersApi.getOnlineUsers()
      const data = (res.data as any)?.data || res.data
      onlineUsers.value = data
    } finally {
      isLoading.value = false
    }
  }

  /**
   * @deprecated Polling replaced by WebSockets.
   * Now performs a single fetch and does not set up a recurring interval.
   */
  function startPolling() {
    fetchUsers()
  }

  /** @deprecated No-op. Polling no longer used. */
  function stopPolling() {
    // Nothing to do.
  }

  return {
    allUsers,
    onlineUsers,
    isLoading,
    fetchUsers,
    fetchOnlineUsers,
    startPolling,
    stopPolling
  }
})

