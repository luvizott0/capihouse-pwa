import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppNotification } from '@/types/models'
import * as notifApi from '@/api/notifications'
import type { NotificationCategoryCounts } from '@/api/notifications'
import * as groupsApi from '@/api/groups'
import { connectEcho } from '@/services/echo'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(1)
  const selectedCategory = ref<string>('all')
  const categoryCounts = ref<NotificationCategoryCounts>({
    all: 0,
    unread: 0,
    likes: 0,
    comments: 0,
    mentions: 0,
    groups: 0,
    events: 0,
    polls: 0,
  })

  async function fetchUnreadCount() {
    try {
      const res = await notifApi.getUnreadCount()
      unreadCount.value = res.data.unread_count
    } catch {
      // Ignore network errors
    }
  }

  async function fetchCategoryCounts() {
    try {
      const res = await notifApi.getCategoryCounts()
      categoryCounts.value = res.data
    } catch {
      // Ignore network errors
    }
  }

  async function fetchNotifications(page = 1, category = selectedCategory.value) {
    isLoading.value = true
    selectedCategory.value = category
    try {
      const res = await notifApi.getNotifications(page, category)
      if (page === 1) {
        notifications.value = res.data.data
      } else {
        notifications.value.push(...res.data.data)
      }
      currentPage.value = res.data.current_page
      lastPage.value = res.data.last_page
      await Promise.all([fetchUnreadCount(), fetchCategoryCounts()])
    } finally {
      isLoading.value = false
    }
  }

  async function setCategory(category: string) {
    if (selectedCategory.value === category) {
      selectedCategory.value = 'all'
    } else {
      selectedCategory.value = category
    }
    await fetchNotifications(1, selectedCategory.value)
  }

  async function markAsRead(id: number) {
    const item = notifications.value.find(n => n.id === id)
    if (item) {
      if (!item.read_at) {
        item.read_at = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
        categoryCounts.value.unread = Math.max(0, (categoryCounts.value.unread ?? 1) - 1)
      }
    } else {
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    try {
      await notifApi.markNotificationAsRead(id)
      await Promise.all([fetchUnreadCount(), fetchCategoryCounts()])
    } catch {
      // Silent error
    }
  }

  async function markAllAsRead() {
    notifications.value.forEach(n => {
      n.read_at = n.read_at || new Date().toISOString()
    })
    unreadCount.value = 0
    categoryCounts.value.unread = 0
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

  /**
   * Subscribe to the user's private channel to receive real-time notifications.
   * Call this after the user is authenticated and Echo is connected.
   */
  function subscribeToNotifications(userId: number) {
    const echo = connectEcho()
    echo.private(`App.Models.User.${userId}`)
      .listen('.NotificationSent', (data: { notification: AppNotification; unread_count: number }) => {
        // Update category counts
        categoryCounts.value.all += 1
        categoryCounts.value.unread = (categoryCounts.value.unread ?? 0) + 1
        const type = data.notification.type
        if (type === 'post_like' || type === 'comment_like') {
          categoryCounts.value.likes += 1
        } else if (type === 'post_comment' || type === 'comment_reply') {
          categoryCounts.value.comments += 1
        } else if (type === 'post_mention' || type === 'comment_mention') {
          categoryCounts.value.mentions += 1
        } else if (type === 'group_invite') {
          categoryCounts.value.groups += 1
        } else if (type === 'event_rsvp') {
          categoryCounts.value.events += 1
        }

        const matchesCategory =
          selectedCategory.value === 'all' ||
          selectedCategory.value === 'unread' ||
          (selectedCategory.value === 'likes' && (type === 'post_like' || type === 'comment_like')) ||
          (selectedCategory.value === 'comments' && (type === 'post_comment' || type === 'comment_reply')) ||
          (selectedCategory.value === 'mentions' && (type === 'post_mention' || type === 'comment_mention')) ||
          (selectedCategory.value === 'groups' && type === 'group_invite') ||
          (selectedCategory.value === 'events' && type === 'event_rsvp')

        if (matchesCategory) {
          notifications.value.unshift(data.notification)
        }
        unreadCount.value = data.unread_count
      })
  }

  function unsubscribeFromNotifications(userId: number) {
    const echo = connectEcho()
    echo.leave(`App.Models.User.${userId}`)
  }

  /**
   * @deprecated Use subscribeToNotifications() instead.
   * Kept for backward compatibility — now is a no-op.
   */
  function startPolling() {
    // Polling replaced by WebSockets. Initial unread count is fetched by fetchUnreadCount().
    fetchUnreadCount()
  }

  /** @deprecated No-op. Kept for backward compatibility. */
  function stopPolling() {
    // Nothing to stop — polling no longer used.
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    currentPage,
    lastPage,
    selectedCategory,
    categoryCounts,
    fetchNotifications,
    fetchUnreadCount,
    fetchCategoryCounts,
    setCategory,
    markAsRead,
    markAllAsRead,
    acceptGroupInvite,
    declineGroupInvite,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    startPolling,
    stopPolling,
  }
})

