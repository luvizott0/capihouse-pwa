import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Group, GroupMessage, User } from '@/types/models'
import * as groupsApi from '@/api/groups'
import { connectEcho } from '@/services/echo'

const GROUPS_CACHE_KEY = 'capihouse_groups_cache'

function loadInitialGroupsCache(): Group[] {
  try {
    const stored = localStorage.getItem(GROUPS_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function saveGroupsCache(data: Group[]) {
  try {
    localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(data.slice(0, 20)))
  } catch {}
}

export const useGroupsStore = defineStore('groups', () => {
  const initialGroups = loadInitialGroupsCache()
  const myGroups = ref<Group[]>(initialGroups)
  const currentGroup = ref<Group | null>(null)
  const messages = ref<GroupMessage[]>([])
  const members = ref<User[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const hasLoaded = ref(initialGroups.length > 0)

  const activeFilters = ref<{ search?: string; date?: string; userId?: number }>({})

  async function fetchMyGroups(options?: { search?: string; date?: string; userId?: number }) {
    isLoading.value = true
    if (options) {
      activeFilters.value = {
        search: options.search || undefined,
        date: options.date || undefined,
        userId: options.userId || undefined,
      }
    } else {
      activeFilters.value = {}
    }
    try {
      const res = await groupsApi.getGroups({
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        user_id: activeFilters.value.userId,
      })
      myGroups.value = res.data.data
      hasLoaded.value = true
      if (!activeFilters.value.search && !activeFilters.value.date && !activeFilters.value.userId) {
        saveGroupsCache(res.data.data)
      }
    } catch (err) {
      console.error('Erro ao buscar meus grupos:', err)
    } finally {
      isLoading.value = false
    }
  }

  function clearFilters() {
    activeFilters.value = {}
  }

  async function fetchGroup(id: number) {
    isLoading.value = true
    try {
      const res = await groupsApi.getGroup(id)
      currentGroup.value = res.data
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function createGroup(formData: FormData) {
    isLoading.value = true
    try {
      const res = await groupsApi.createGroup(formData)
      myGroups.value.unshift(res.data)
      return res.data
    } finally {
      isLoading.value = false
    }
  }

  async function inviteUsers(groupId: number, userIds: number[]) {
    return await groupsApi.inviteUsers(groupId, userIds)
  }

  async function acceptInvite(groupId: number) {
    const res = await groupsApi.acceptInvite(groupId)
    await fetchMyGroups()
    if (currentGroup.value?.id === groupId) {
      currentGroup.value = res.data.group
    }
    return res.data
  }

  async function declineInvite(groupId: number) {
    const res = await groupsApi.declineInvite(groupId)
    myGroups.value = myGroups.value.filter(g => g.id !== groupId)
    return res.data
  }

  async function leaveGroup(groupId: number) {
    const res = await groupsApi.leaveGroup(groupId)
    myGroups.value = myGroups.value.filter(g => g.id !== groupId)
    if (currentGroup.value?.id === groupId) {
      currentGroup.value.is_member = false
      currentGroup.value.membership_status = null
    }
    return res.data
  }

  async function fetchMessages(groupId: number) {
    try {
      const res = await groupsApi.getGroupMessages(groupId)
      messages.value = res.data
    } catch (err) {
      console.error('Erro ao buscar mensagens do grupo:', err)
    }
  }

  async function sendMessage(groupId: number, content: string) {
    if (!content.trim()) return
    isSending.value = true
    try {
      const res = await groupsApi.sendGroupMessage(groupId, content.trim())
      messages.value.push(res.data)
      return res.data
    } finally {
      isSending.value = false
    }
  }

  async function fetchMembers(groupId: number) {
    try {
      const res = await groupsApi.getGroupMembers(groupId)
      members.value = res.data
    } catch (err) {
      console.error('Erro ao buscar membros do grupo:', err)
    }
  }

  /**
   * Subscribe to a group's private WebSocket channel to receive messages in real time.
   * Call this when entering the group chat view.
   */
  function subscribeToGroupChat(groupId: number) {
    const echo = connectEcho()
    echo.private(`group.${groupId}`)
      .listen('.GroupMessageSent', (data: { message: GroupMessage }) => {
        // Avoid duplicates (own message is already added by sendMessage)
        const exists = messages.value.some(m => m.id === data.message.id)
        if (!exists) {
          messages.value.push(data.message)
        }
      })
  }

  async function updateGroupCover(groupId: number, fileOrBlob: Blob | File) {
    const formData = new FormData()
    formData.append('photo', fileOrBlob, 'group-cover.webp')
    const res = await groupsApi.updateGroup(groupId, formData)
    currentGroup.value = res.data
    const index = myGroups.value.findIndex(g => g.id === groupId)
    if (index !== -1) {
      myGroups.value[index] = res.data
    }
    return res.data
  }

  /**
   * Unsubscribe from a group's WebSocket channel.
   * Call this when leaving the group chat view.
   */
  function unsubscribeFromGroupChat(groupId: number) {
    const echo = connectEcho()
    echo.leave(`group.${groupId}`)
  }

  return {
    myGroups,
    currentGroup,
    messages,
    members,
    activeFilters,
    clearFilters,
    isLoading,
    isSending,
    hasLoaded,
    fetchMyGroups,
    fetchGroup,
    createGroup,
    inviteUsers,
    acceptInvite,
    declineInvite,
    leaveGroup,
    fetchMessages,
    sendMessage,
    fetchMembers,
    updateGroupCover,
    subscribeToGroupChat,
    unsubscribeFromGroupChat,
  }
})

