<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from '@/stores/admin'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import RetroSelect from '@/components/ui/RetroSelect.vue'
import RetroBadge from '@/components/ui/RetroBadge.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'

const adminStore = useAdminStore()

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Aprovados', value: 'approved' },
  { label: 'Rejeitados', value: 'rejected' },
  { label: 'Banidos', value: 'banned' }
]

onMounted(() => {
  adminStore.fetchUsers()
})

const showConfirmModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalDetails = ref('')
const confirmModalAction = ref<() => Promise<void>>(() => Promise.resolve())
const isProcessingAction = ref(false)

function openRejectConfirm(user: any) {
  confirmModalTitle.value = '» Rejeitar Cadastro'
  confirmModalMessage.value = `Deseja realmente rejeitar a solicitação de ${user.name}?`
  confirmModalDetails.value = 'O usuário não terá acesso à rede e seu status será alterado para Rejeitado.'
  confirmModalAction.value = async () => {
    await adminStore.reject(user.id)
  }
  showConfirmModal.value = true
}

function openBanConfirm(user: any) {
  confirmModalTitle.value = '» Banir Usuário'
  confirmModalMessage.value = `Deseja realmente banir ${user.name} (@${user.username})?`
  confirmModalDetails.value = 'O usuário terá todas as suas sessões e tokens revogados imediatamente e não poderá mais acessar a CapiHouse.'
  confirmModalAction.value = async () => {
    await adminStore.ban(user.id)
  }
  showConfirmModal.value = true
}

async function handleConfirmModalAction() {
  isProcessingAction.value = true
  try {
    await confirmModalAction.value()
    showConfirmModal.value = false
  } finally {
    isProcessingAction.value = false
  }
}

const getStatusColor = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  if (status === 'banned') return 'neutral'
  return 'primary'
}
</script>
<template>
  <RetroCard title="» Gerenciamento de Usuários">
    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: flex-end;">
      <div style="flex: 1;"><RetroInput v-model="adminStore.filters.search" placeholder="Buscar usuário..." @keyup.enter="adminStore.fetchUsers()" /></div>
      <div style="width: 200px;"><RetroSelect v-model="adminStore.filters.status" :options="statusOptions" @change="adminStore.fetchUsers()" /></div>
      <RetroButton @click="adminStore.fetchUsers()" style="margin-bottom: 1rem;">Filtrar</RetroButton>
    </div>

    <div v-if="adminStore.isLoading">Carregando...</div>
    <div v-else style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
        <thead>
          <tr style="border-bottom: 2px solid var(--color-border); background-color: var(--color-primary-50);">
            <th style="padding: 0.75rem;">Usuário</th>
            <th style="padding: 0.75rem;">Status</th>
            <th style="padding: 0.75rem;">Cargo</th>
            <th style="padding: 0.75rem;">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in adminStore.users" :key="user.id" style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
              <UserAvatar :user="user" size="sm" />
              <div>
                <div style="font-weight: bold;">{{ user.name }}</div>
                <div style="color: var(--color-muted); font-size: 0.8rem;">@{{ user.username }}</div>
              </div>
            </td>
            <td style="padding: 0.75rem;"><RetroBadge :variant="getStatusColor(user.status)" :text="user.status.toUpperCase()" /></td>
            <td style="padding: 0.75rem;"><RetroBadge :variant="user.role === 'admin' ? 'primary' : 'neutral'" :text="user.role.toUpperCase()" /></td>
            <td style="padding: 0.75rem; display: flex; gap: 0.25rem;">
              <button v-if="user.status === 'pending'" @click="adminStore.approve(user.id)" class="retro-button retro-button-secondary" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Aprovar</button>
              <button v-if="user.status === 'pending'" @click="openRejectConfirm(user)" class="retro-button retro-button-danger" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Rejeitar</button>
              <button v-if="user.status === 'approved' && user.role !== 'admin'" @click="openBanConfirm(user)" class="retro-button retro-button-danger" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Banir</button>
              <button v-if="user.status === 'banned'" @click="adminStore.unban(user.id)" class="retro-button retro-button-secondary" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;">Desbanir</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination Controls Placeholder -->
      <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">
        <button v-for="p in adminStore.pagination.last_page" :key="p" @click="adminStore.setPage(p)" :class="['retro-button', p === adminStore.pagination.current_page ? '' : 'retro-button-secondary']" style="padding: 0.2rem 0.5rem;">{{ p }}</button>
      </div>
    </div>

    <!-- Confirm Modal for Destructive Admin Actions -->
    <RetroConfirmModal
      v-model="showConfirmModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :details="confirmModalDetails"
      confirmText="Confirmar"
      :loading="isProcessingAction"
      @confirm="handleConfirmModalAction"
    />
  </RetroCard>
</template>
