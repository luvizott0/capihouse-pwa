import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppNotification } from '@/types/models'
import * as notifApi from '@/api/notifications'
import * as groupsApi from '@/api/groups'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(1)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function fetchUnreadCount() {
    try {
      const res = await notifApi.getUnreadCount()
      unreadCount.value = res.data.unread_count
    } catch {
      // Ignore network errors on polling
    }
  }

  async function fetchNotifications(page = 1) {
    isLoading.value = true
    try {
      const res = await notifApi.getNotifications(page)
      if (page === 1) {
        notifications.value = res.data.data
      } else {
        notifications.value.push(...res.data.data)
      }
      currentPage.value = res.data.current_page
      lastPage.value = res.data.last_page
      await fetchUnreadCount()
    } finally {
      isLoading.value = false
    }
  }

  async function markAsRead(id: number) {
    const item = notifications.value.find(n => n.id === id)
    if (item && !item.read_at) {
      item.read_at = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      try {
        await notifApi.markNotificationAsRead(id)
      } catch {
        // Silent error
      }
    }
  }

  async function markAllAsRead() {
    notifications.value.forEach(n => {
      n.read_at = n.read_at || new Date().toISOString()
    })
    unreadCount.value = 0
    try {
      await notifApi.markAllNotificationsAsRead()
    } catch {
      // Silent error
    }
  }

  async function acceptGroupInvite(notificationId: number, groupId: number) {
    await groupsApi.acceptInvite(groupId)
    const item = notifications.value.find(n => n.id === notificationId)
    if (item) {
      if (!item.data) item.data = {}
      item.data.status = 'accepted'
    }
    await markAsRead(notificationId)
  }

  async function declineGroupInvite(notificationId: number, groupId: number) {
    await groupsApi.declineInvite(groupId)
    const item = notifications.value.find(n => n.id === notificationId)
    if (item) {
      if (!item.data) item.data = {}
      item.data.status = 'declined'
    }
    await markAsRead(notificationId)
  }

  function startPolling() {
    fetchUnreadCount()
    if (!pollInterval) {
      pollInterval = setInterval(fetchUnreadCount, 25000)
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    currentPage,
    lastPage,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    acceptGroupInvite,
    declineGroupInvite,
    startPolling,
    stopPolling,
  }
})
