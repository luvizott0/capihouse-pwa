import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationsStore } from '@/stores/notifications'
import * as notifApi from '@/api/notifications'

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
    } as any)

    const store = useNotificationsStore()
    await store.fetchUnreadCount()

    expect(store.unreadCount).toBe(5)
  })

  it('marks all as read and updates unreadCount to 0', async () => {
    vi.mocked(notifApi.markAllNotificationsAsRead).mockResolvedValueOnce({
      data: { message: 'ok' },
    } as any)

    const store = useNotificationsStore()
    store.unreadCount = 3
    store.notifications = [
      { id: 1, user_id: 1, type: 'group_invite', title: 'Convite', content: 'teste', read_at: null, created_at: '' },
    ]

    await store.markAllAsRead()
    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]!.read_at).toBeTruthy()
  })
})
