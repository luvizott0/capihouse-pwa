import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUsersStore } from '@/stores/users'
import * as usersApi from '@/api/users'
import { connectEcho } from '@/services/echo'
import type { User } from '@/types/models'
import type { AxiosResponse } from 'axios'

vi.mock('@/api/users')
vi.mock('@/services/echo')

describe('Users Store', () => {
  const storeMap: Record<string, string> = {}

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    for (const key in storeMap) delete storeMap[key]

    // Setup safe localStorage mock
    vi.stubGlobal('localStorage', {
      getItem: vi.fn<(key: string) => string | null>((k: string) => storeMap[k] ?? null),
      setItem: vi.fn<(key: string, value: string) => void>((k: string, v: string) => {
        storeMap[k] = v
      }),
      removeItem: vi.fn<(key: string) => void>((k: string) => {
        delete storeMap[k]
      }),
      clear: vi.fn<() => void>(() => {
        for (const k in storeMap) delete storeMap[k]
      }),
      length: 0,
      key: vi.fn<() => string | null>(() => null),
    })

    localStorage.setItem('capihouse_token', 'test-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with default values', () => {
    const store = useUsersStore()
    expect(store.allUsers).toEqual([])
    expect(store.onlineUsers).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('fetches users and updates allUsers', async () => {
    const mockUsers: User[] = [
      { id: 1, name: 'Alice', username: 'alice', is_online: true } as User,
      { id: 2, name: 'Bob', username: 'bob', is_online: false } as User,
    ]

    vi.mocked(usersApi.getUsers).mockResolvedValueOnce({
      data: mockUsers,
    } as unknown as AxiosResponse<User[]>)

    const store = useUsersStore()
    await store.fetchUsers()

    expect(store.allUsers).toHaveLength(2)
    expect(store.onlineUsers).toHaveLength(1)
    expect(store.onlineUsers[0]?.username).toBe('alice')
  })

  it('joins presence channel and dynamically updates online users with here, joining, and leaving', async () => {
    let hereCallback: ((users: Array<{ id: number; name: string; username: string }>) => void) | null = null
    let joiningCallback: ((user: { id: number; name: string; username: string }) => void) | null = null
    let leavingCallback: ((user: { id: number; name: string; username: string }) => void) | null = null

    const mockPresenceChannel = {
      here: vi.fn<any>((cb: typeof hereCallback) => {
        hereCallback = cb
        return mockPresenceChannel
      }),
      joining: vi.fn<any>((cb: typeof joiningCallback) => {
        joiningCallback = cb
        return mockPresenceChannel
      }),
      leaving: vi.fn<any>((cb: typeof leavingCallback) => {
        leavingCallback = cb
        return mockPresenceChannel
      }),
    }

    vi.mocked(connectEcho).mockReturnValue({
      join: vi.fn<any>(() => mockPresenceChannel),
    } as any)

    const mockUsers: User[] = [
      { id: 1, name: 'Alice', username: 'alice', is_online: false } as User,
      { id: 2, name: 'Bob', username: 'bob', is_online: false } as User,
      { id: 3, name: 'Charlie', username: 'charlie', is_online: false } as User,
    ]

    vi.mocked(usersApi.getUsers).mockResolvedValueOnce({
      data: mockUsers,
    } as unknown as AxiosResponse<User[]>)

    const store = useUsersStore()
    await store.fetchUsers()
    store.joinPresenceChannel()

    expect(hereCallback).toBeTruthy()
    expect(joiningCallback).toBeTruthy()
    expect(leavingCallback).toBeTruthy()

    // 1. '.here' event: only Alice is connected initially
    hereCallback!([{ id: 1, name: 'Alice', username: 'alice' }])
    expect(store.allUsers.find(u => u.id === 1)?.is_online).toBe(true)
    expect(store.allUsers.find(u => u.id === 2)?.is_online).toBe(false)
    expect(store.onlineUsers.map(u => u.id)).toEqual([1])

    // 2. '.joining' event: Bob connects
    joiningCallback!({ id: 2, name: 'Bob', username: 'bob' })
    expect(store.allUsers.find(u => u.id === 2)?.is_online).toBe(true)
    expect(store.onlineUsers.map(u => u.id)).toEqual([1, 2])

    // 3. '.leaving' event: Alice disconnects
    leavingCallback!({ id: 1, name: 'Alice', username: 'alice' })
    expect(store.allUsers.find(u => u.id === 1)?.is_online).toBe(false)
    expect(store.onlineUsers.map(u => u.id)).toEqual([2])
  })
})
