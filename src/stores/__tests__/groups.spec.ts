/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGroupsStore } from '@/stores/groups'
import * as groupsApi from '@/api/groups'

vi.mock('@/api/groups')

describe('Groups Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const store = useGroupsStore()
    expect(store.myGroups).toEqual([])
    expect(store.currentGroup).toBeNull()
    expect(store.messages).toEqual([])
  })

  it('fetches my groups and populates list', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            name: 'Capivaras Unidas',
            description: 'Desc',
            creator_id: 1,
            image_url: null,
            members_count: 2,
            is_member: true,
            membership_status: 'accepted',
            my_role: 'owner',
            created_at: '',
          },
        ],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    const store = useGroupsStore()
    await store.fetchMyGroups()

    expect(store.myGroups).toHaveLength(1)
    expect(store.myGroups[0]!.name).toBe('Capivaras Unidas')
  })

  it('sends message and appends to messages list', async () => {
    vi.mocked(groupsApi.sendGroupMessage).mockResolvedValueOnce({
      data: {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Oi amigos',
        user: { id: 1, name: 'Capivara', username: 'capi' },
        created_at: '2026-09-14',
      },
    } as any)

    const store = useGroupsStore()
    await store.sendMessage(1, 'Oi amigos')

    expect(store.messages).toHaveLength(1)
    expect(store.messages[0]!.content).toBe('Oi amigos')
  })

  it('does not duplicate message if already present in messages list', async () => {
    const store = useGroupsStore()
    store.messages = [
      {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Oi amigos (via websocket)',
        user: { id: 1, name: 'Capivara', username: 'capi' } as any,
        created_at: '2026-09-14',
      },
    ]

    vi.mocked(groupsApi.sendGroupMessage).mockResolvedValueOnce({
      data: {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Oi amigos',
        user: { id: 1, name: 'Capivara', username: 'capi' },
        created_at: '2026-09-14',
      },
    } as any)

    await store.sendMessage(1, 'Oi amigos')

    expect(store.messages).toHaveLength(1)
  })

  it('edits message and updates content in messages list', async () => {
    const store = useGroupsStore()
    store.messages = [
      {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Mensagem antiga',
        user: { id: 1, name: 'Capivara', username: 'capi' } as any,
        created_at: '2026-09-14',
      },
    ]

    vi.mocked(groupsApi.updateGroupMessage).mockResolvedValueOnce({
      data: {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Mensagem atualizada',
        is_edited: true,
        user: { id: 1, name: 'Capivara', username: 'capi' },
        created_at: '2026-09-14',
      },
    } as any)

    await store.editMessage(1, 10, 'Mensagem atualizada')

    expect(store.messages[0]!.content).toBe('Mensagem atualizada')
    expect(store.messages[0]!.is_edited).toBe(true)
  })

  it('deletes message and marks it as deleted in messages list', async () => {
    const store = useGroupsStore()
    store.messages = [
      {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'Mensagem para apagar',
        user: { id: 1, name: 'Capivara', username: 'capi' } as any,
        created_at: '2026-09-14',
      },
    ]

    vi.mocked(groupsApi.deleteGroupMessage).mockResolvedValueOnce({
      data: {
        id: 10,
        group_id: 1,
        user_id: 1,
        content: 'mensagem deletada',
        is_deleted: true,
        user: { id: 1, name: 'Capivara', username: 'capi' },
        created_at: '2026-09-14',
      },
    } as any)

    await store.deleteMessage(1, 10)

    expect(store.messages[0]!.content).toBe('mensagem deletada')
    expect(store.messages[0]!.is_deleted).toBe(true)
  })
})
