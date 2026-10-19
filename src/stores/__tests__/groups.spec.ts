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
  })

  it('fetches my groups and populates list', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            name: 'Capivaras Unidas',
            color: '#a66130',
            description: 'Desc',
            creator_id: 1,
            members_count: 2,
            members: [
              { id: 2, name: 'Amigo 1', username: 'amigo1' },
              { id: 3, name: 'Amigo 2', username: 'amigo2' },
            ] as any,
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
    expect(store.myGroups[0]!.color).toBe('#a66130')
  })

  it('creates group and prepends to myGroups', async () => {
    const newGroup = {
      id: 2,
      name: 'Amigos Próximos',
      color: '#10b981',
      creator_id: 1,
      members_count: 1,
      members: [{ id: 5, name: 'BFF', username: 'bff' }] as any,
    }

    vi.mocked(groupsApi.createGroup).mockResolvedValueOnce({
      data: newGroup,
    } as any)

    const store = useGroupsStore()
    const result = await store.createGroup({
      name: 'Amigos Próximos',
      color: '#10b981',
      members: [5],
    })

    expect(result.id).toBe(2)
    expect(store.myGroups[0]!.name).toBe('Amigos Próximos')
    expect(store.myGroups[0]!.color).toBe('#10b981')
  })

  it('updates group in myGroups', async () => {
    const store = useGroupsStore()
    store.myGroups = [
      {
        id: 1,
        name: 'Nome Antigo',
        color: '#a66130',
        creator_id: 1,
      } as any,
    ]

    vi.mocked(groupsApi.updateGroup).mockResolvedValueOnce({
      data: {
        id: 1,
        name: 'Nome Novo',
        color: '#3b82f6',
        creator_id: 1,
      },
    } as any)

    await store.updateGroup(1, { name: 'Nome Novo', color: '#3b82f6' })

    expect(store.myGroups[0]!.name).toBe('Nome Novo')
    expect(store.myGroups[0]!.color).toBe('#3b82f6')
  })

  it('deletes group from myGroups', async () => {
    const store = useGroupsStore()
    store.myGroups = [
      { id: 1, name: 'Para Deletar', creator_id: 1 } as any,
      { id: 2, name: 'Para Ficar', creator_id: 1 } as any,
    ]

    vi.mocked(groupsApi.deleteGroup).mockResolvedValueOnce({
      data: { message: 'Excluído' },
    } as any)

    await store.deleteGroup(1)

    expect(store.myGroups).toHaveLength(1)
    expect(store.myGroups[0]!.id).toBe(2)
  })
})
