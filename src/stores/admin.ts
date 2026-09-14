import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { User } from '@/types/models'
import * as adminApi from '@/api/admin'

export const useAdminStore = defineStore('admin', () => {
  const users = ref<User[]>([])
  const filters = reactive({ status: '', search: '' })
  const pagination = reactive({ current_page: 1, last_page: 1, total: 0 })
  const isLoading = ref(false)

  async function fetchUsers() {
    isLoading.value = true
    try {
      const res = await adminApi.getUsers({
        page: pagination.current_page,
        status: filters.status,
        search: filters.search
      })
      users.value = res.data.data
      pagination.current_page = res.data.meta.current_page
      pagination.last_page = res.data.meta.last_page
      pagination.total = res.data.meta.total
    } finally {
      isLoading.value = false
    }
  }

  function setFilter(status: string) {
    filters.status = status
    pagination.current_page = 1
    fetchUsers()
  }

  function setPage(page: number) {
    pagination.current_page = page
    fetchUsers()
  }

  async function approve(id: number) { await adminApi.approveUser(id); fetchUsers() }
  async function reject(id: number) { await adminApi.rejectUser(id); fetchUsers() }
  async function ban(id: number) { await adminApi.banUser(id); fetchUsers() }
  async function unban(id: number) { await adminApi.unbanUser(id); fetchUsers() }
  async function promote(id: number) { await adminApi.promoteUser(id); fetchUsers() }
  async function demote(id: number) { await adminApi.demoteUser(id); fetchUsers() }
  async function deleteUser(id: number) { await adminApi.deleteUser(id); fetchUsers() }

  return {
    users,
    filters,
    pagination,
    isLoading,
    fetchUsers,
    setFilter,
    setPage,
    approve,
    reject,
    ban,
    unban,
    promote,
    demote,
    deleteUser
  }
})
