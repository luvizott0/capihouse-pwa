import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { User } from '@/types/models'
import * as adminApi from '@/api/admin'

export const useAdminStore = defineStore('admin', () => {
  const users = ref<User[]>([])
  const filters = reactive({ status: '', search: '' })
  const pagination = reactive({ current_page: 1, last_page: 1, total: 0 })
  const isLoading = ref(false)
  const actionLoadingId = ref<number | null>(null)
  const errorMessage = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  async function fetchUsers() {
    isLoading.value = true
    errorMessage.value = null
    try {
      const params: Record<string, any> = {
        page: pagination.current_page
      }
      if (filters.status) {
        params.status = filters.status
      }
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim()
      }

      const res = await adminApi.getUsers(params)
      users.value = res.data.data || []
      if (res.data.meta) {
        pagination.current_page = res.data.meta.current_page || 1
        pagination.last_page = res.data.meta.last_page || 1
        pagination.total = res.data.meta.total || 0
      } else if ((res.data as any).current_page) {
        pagination.current_page = (res.data as any).current_page || 1
        pagination.last_page = (res.data as any).last_page || 1
        pagination.total = (res.data as any).total || 0
      }
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err)
      errorMessage.value = err.response?.data?.message || 'Erro ao carregar lista de usuários.'
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

  async function approve(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.approveUser(id)
      successMessage.value = 'Usuário aprovado com sucesso!'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao aprovar usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function reject(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.rejectUser(id)
      successMessage.value = 'Usuário rejeitado com sucesso.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao rejeitar usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function ban(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.banUser(id)
      successMessage.value = 'Usuário banido com sucesso.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao banir usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function unban(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.unbanUser(id)
      successMessage.value = 'Usuário desbanido com sucesso.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao desbanir usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function promote(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.promoteUser(id)
      successMessage.value = 'Usuário promovido a Administrador.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao promover usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function demote(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.demoteUser(id)
      successMessage.value = 'Cargo de Administrador revogado.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao rebaixar usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  async function deleteUser(id: number) {
    actionLoadingId.value = id
    errorMessage.value = null
    try {
      await adminApi.deleteUser(id)
      successMessage.value = 'Usuário excluído com sucesso.'
      await fetchUsers()
    } catch (err: any) {
      errorMessage.value = err.response?.data?.message || 'Falha ao excluir usuário.'
      throw err
    } finally {
      actionLoadingId.value = null
    }
  }

  return {
    users,
    filters,
    pagination,
    isLoading,
    actionLoadingId,
    errorMessage,
    successMessage,
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
