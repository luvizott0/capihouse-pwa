import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Group, GroupMessage, User } from '@/types/models'
import * as groupsApi from '@/api/groups'

export const useGroupsStore = defineStore('groups', () => {
  const myGroups = ref<Group[]>([])
  const currentGroup = ref<Group | null>(null)
  const messages = ref<GroupMessage[]>([])
  const members = ref<User[]>([])
  const isLoading = ref(false)
  const isSending = ref(false)

  async function fetchMyGroups() {
    isLoading.value = true
    try {
      const res = await groupsApi.getGroups()
      myGroups.value = res.data.data
    } catch (err) {
      console.error('Erro ao buscar meus grupos:', err)
    } finally {
      isLoading.value = false
    }
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

  return {
    myGroups,
    currentGroup,
    messages,
    members,
    isLoading,
    isSending,
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
  }
})
