import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '@/stores/notifications'
import * as notifApi from '@/api/notifications'
import type { AppNotification } from '@/types/models'
import type { AxiosResponse } from 'axios'

vi.mock('@/api/notifications')
vi.mock('@/api/groups')

describe('Notifications Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useNotificationsStore()
    expect(store.notifications).toEqual([])
    expect(store.unreadCount).toBe(0)
    expect(store.isLoading).toBe(false)
  })

  it('fetches unread count and updates store', async () => {
    vi.mocked(notifApi.getUnreadCount).mockResolvedValueOnce({
      data: { unread_count: 5 },
    } as unknown as AxiosResponse<{ unread_count: number }>)

    const store = useNotificationsStore()
    await store.fetchUnreadCount()

    expect(store.unreadCount).toBe(5)
  })

  it('marks all as read and updates unreadCount to 0', async () => {
    vi.mocked(notifApi.markAllNotificationsAsRead).mockResolvedValueOnce({
      data: { message: 'ok' },
    } as unknown as AxiosResponse<{ message: string }>)

    const store = useNotificationsStore()
    store.unreadCount = 3
    store.notifications = [
      { id: 1, user_id: 1, type: 'group_invite', title: 'Convite', content: 'teste', read_at: null, created_at: '' },
    ]

    await store.markAllAsRead()
    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]!.read_at).toBeTruthy()
  })

  it('fetches category counts and updates store', async () => {
    vi.mocked(notifApi.getCategoryCounts).mockResolvedValueOnce({
      data: { all: 10, unread: 5, likes: 4, comments: 3, mentions: 2, groups: 1, events: 0 },
    } as unknown as AxiosResponse<notifApi.NotificationCategoryCounts>)

    const store = useNotificationsStore()
    await store.fetchCategoryCounts()

    expect(store.categoryCounts).toEqual({
      all: 10,
      unread: 5,
      likes: 4,
      comments: 3,
      mentions: 2,
      groups: 1,
      events: 0,
    })
  })

  it('filters notifications by category and resets when toggled', async () => {
    vi.mocked(notifApi.getNotifications).mockResolvedValue({
      data: {
        data: [
          { id: 1, user_id: 1, type: 'post_like', title: 'Curtida', content: 'x', read_at: null, created_at: '' },
        ],
        current_page: 1,
        last_page: 1,
        total: 1,
      },
    } as unknown as AxiosResponse<{ data: AppNotification[]; current_page: number; last_page: number; total: number }>)
    vi.mocked(notifApi.getUnreadCount).mockResolvedValue({
      data: { unread_count: 1 },
    } as unknown as AxiosResponse<{ unread_count: number }>)
    vi.mocked(notifApi.getCategoryCounts).mockResolvedValue({
      data: { all: 1, likes: 1, comments: 0, mentions: 0, groups: 0, events: 0 },
    } as unknown as AxiosResponse<notifApi.NotificationCategoryCounts>)

    const store = useNotificationsStore()

    // Select 'likes'
    await store.setCategory('likes')
    expect(store.selectedCategory).toBe('likes')
    expect(notifApi.getNotifications).toHaveBeenCalledWith(1, 'likes')

    // Click 'likes' again to toggle back to 'all'
    await store.setCategory('likes')
    expect(store.selectedCategory).toBe('all')
    expect(notifApi.getNotifications).toHaveBeenCalledWith(1, 'all')
  })
})
