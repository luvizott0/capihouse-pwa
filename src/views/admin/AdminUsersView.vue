<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import RetroSelect from '@/components/ui/RetroSelect.vue'
import RetroBadge from '@/components/ui/RetroBadge.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'

const adminStore = useAdminStore()
const authStore = useAuthStore()
const router = useRouter()

const statusOptions = [
  { label: 'Todos os Status', value: '' },
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

async function handleApprove(user: any) {
  try {
    await adminStore.approve(user.id)
  } catch (err: any) {
    alert(err.response?.data?.message || 'Falha ao aprovar o usuário.')
  }
}

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

async function handleUnban(user: any) {
  try {
    await adminStore.unban(user.id)
  } catch (err: any) {
    alert(err.response?.data?.message || 'Falha ao desbanir o usuário.')
  }
}

async function handleConfirmModalAction() {
  isProcessingAction.value = true
  try {
    await confirmModalAction.value()
    showConfirmModal.value = false
  } catch (err: any) {
    alert(err.response?.data?.message || 'Erro ao processar ação.')
  } finally {
    isProcessingAction.value = false
  }
}

const isImpersonatingTarget = ref<number | null>(null)

async function handleImpersonate(targetUser: any) {
  isImpersonatingTarget.value = targetUser.id
  try {
    await authStore.impersonate({ user_id: targetUser.id })
    router.push('/feed')
  } catch (err: any) {
    alert(err.response?.data?.message || 'Falha ao personificar o usuário.')
  } finally {
    isImpersonatingTarget.value = null
  }
}

function resetFilters() {
  adminStore.filters.status = ''
  adminStore.filters.search = ''
  adminStore.pagination.current_page = 1
  adminStore.fetchUsers()
}

const getStatusColor = (status: string) => {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  if (status === 'banned') return 'neutral'
  return 'primary'
}

const getStatusLabel = (status: string) => {
  if (status === 'approved') return 'APROVADO'
  if (status === 'pending') return 'PENDENTE'
  if (status === 'rejected') return 'REJEITADO'
  if (status === 'banned') return 'BANIDO'
  return status.toUpperCase()
}
</script>

<template>
  <RetroCard title="» Gerenciamento de Usuários">
    <!-- Success & Error feedback banners -->
    <div v-if="adminStore.successMessage" class="admin-banner admin-banner-success">
      <span>✓ {{ adminStore.successMessage }}</span>
      <button @click="adminStore.successMessage = null" class="banner-close-btn">&times;</button>
    </div>

    <div v-if="adminStore.errorMessage" class="admin-banner admin-banner-error">
      <span>✕ {{ adminStore.errorMessage }}</span>
      <button @click="adminStore.errorMessage = null" class="banner-close-btn">&times;</button>
    </div>

    <!-- Filters Bar -->
    <div class="admin-filters-bar">
      <div class="filter-search">
        <RetroInput
          v-model="adminStore.filters.search"
          placeholder="Buscar por nome, username ou e-mail..."
          @keyup.enter="adminStore.fetchUsers()"
        />
      </div>
      <div class="filter-status">
        <RetroSelect
          v-model="adminStore.filters.status"
          :options="statusOptions"
          @change="adminStore.fetchUsers()"
        />
      </div>
      <div class="filter-actions">
        <RetroButton @click="adminStore.fetchUsers()">Filtrar</RetroButton>
        <button
          v-if="adminStore.filters.status || adminStore.filters.search"
          type="button"
          @click="resetFilters"
          class="retro-button retro-button-secondary"
          title="Limpar filtros"
        >
          Limpar
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="adminStore.isLoading" class="admin-loading">
      <div class="spinner-box">Carregando usuários...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="adminStore.users.length === 0" class="admin-empty">
      <p class="empty-title">Nenhum usuário encontrado.</p>
      <p class="empty-subtitle">
        Não há registros com os filtros atuais selecionados.
      </p>
      <button
        v-if="adminStore.filters.status || adminStore.filters.search"
        @click="resetFilters"
        class="retro-button retro-button-secondary"
        style="margin-top: 0.75rem;"
      >
        Limpar Filtros
      </button>
    </div>

    <!-- Users Content -->
    <div v-else>
      <!-- Desktop Table View -->
      <div class="desktop-table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Status</th>
              <th>Cargo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in adminStore.users" :key="user.id" :class="{ 'pending-row': user.status === 'pending' }">
              <td class="user-cell">
                <UserAvatar :user="user" size="sm" />
                <div class="user-cell-meta">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-handle">@{{ user.username }}</span>
                </div>
              </td>
              <td>
                <RetroBadge :variant="getStatusColor(user.status)" :text="getStatusLabel(user.status)" />
              </td>
              <td>
                <RetroBadge :variant="user.role === 'admin' ? 'primary' : 'neutral'" :text="user.role.toUpperCase()" />
              </td>
              <td class="actions-cell">
                <button
                  v-if="user.id !== authStore.user?.id"
                  @click="handleImpersonate(user)"
                  :disabled="isImpersonatingTarget === user.id"
                  class="retro-button impersonate-btn"
                  title="Logar diretamente como este usuário"
                >
                  {{ isImpersonatingTarget === user.id ? 'Entrando...' : '🎭 Personificar' }}
                </button>
                <button
                  v-if="user.status === 'pending'"
                  @click="handleApprove(user)"
                  :disabled="adminStore.actionLoadingId === user.id"
                  class="retro-button retro-button-secondary approve-btn"
                >
                  {{ adminStore.actionLoadingId === user.id ? 'Aprovando...' : '✓ Aprovar' }}
                </button>
                <button
                  v-if="user.status === 'pending'"
                  @click="openRejectConfirm(user)"
                  :disabled="adminStore.actionLoadingId === user.id"
                  class="retro-button retro-button-danger"
                >
                  ✕ Rejeitar
                </button>
                <button
                  v-if="user.status === 'approved' && user.role !== 'admin'"
                  @click="openBanConfirm(user)"
                  :disabled="adminStore.actionLoadingId === user.id"
                  class="retro-button retro-button-danger"
                >
                  Banir
                </button>
                <button
                  v-if="user.status === 'banned'"
                  @click="handleUnban(user)"
                  :disabled="adminStore.actionLoadingId === user.id"
                  class="retro-button retro-button-secondary"
                >
                  {{ adminStore.actionLoadingId === user.id ? 'Desbanindo...' : 'Desbanir' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="mobile-cards-container">
        <div
          v-for="user in adminStore.users"
          :key="user.id"
          class="user-mobile-card"
          :class="{ 'card-pending': user.status === 'pending' }"
        >
          <div class="card-header">
            <div class="card-user-info">
              <UserAvatar :user="user" size="sm" />
              <div>
                <div class="user-name">{{ user.name }}</div>
                <div class="user-handle">@{{ user.username }}</div>
              </div>
            </div>
            <div class="card-badges">
              <RetroBadge :variant="getStatusColor(user.status)" :text="getStatusLabel(user.status)" />
              <RetroBadge :variant="user.role === 'admin' ? 'primary' : 'neutral'" :text="user.role.toUpperCase()" />
            </div>
          </div>

          <div class="card-actions">
            <button
              v-if="user.id !== authStore.user?.id"
              @click="handleImpersonate(user)"
              :disabled="isImpersonatingTarget === user.id"
              class="retro-button impersonate-btn"
            >
              {{ isImpersonatingTarget === user.id ? 'Entrando...' : '🎭 Personificar' }}
            </button>
            <button
              v-if="user.status === 'pending'"
              @click="handleApprove(user)"
              :disabled="adminStore.actionLoadingId === user.id"
              class="retro-button retro-button-secondary approve-btn"
            >
              {{ adminStore.actionLoadingId === user.id ? 'Aprovando...' : '✓ Aprovar' }}
            </button>
            <button
              v-if="user.status === 'pending'"
              @click="openRejectConfirm(user)"
              :disabled="adminStore.actionLoadingId === user.id"
              class="retro-button retro-button-danger"
            >
              ✕ Rejeitar
            </button>
            <button
              v-if="user.status === 'approved' && user.role !== 'admin'"
              @click="openBanConfirm(user)"
              :disabled="adminStore.actionLoadingId === user.id"
              class="retro-button retro-button-danger"
            >
              Banir
            </button>
            <button
              v-if="user.status === 'banned'"
              @click="handleUnban(user)"
              :disabled="adminStore.actionLoadingId === user.id"
              class="retro-button retro-button-secondary"
            >
              {{ adminStore.actionLoadingId === user.id ? 'Desbanindo...' : 'Desbanir' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="adminStore.pagination.last_page > 1" class="admin-pagination">
        <button
          v-for="p in adminStore.pagination.last_page"
          :key="p"
          @click="adminStore.setPage(p)"
          :class="['retro-button', p === adminStore.pagination.current_page ? '' : 'retro-button-secondary']"
          class="page-btn"
        >
          {{ p }}
        </button>
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

<style scoped>
.admin-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  margin-bottom: 1rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
  border-radius: 2px;
}

.admin-banner-success {
  background-color: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
}

.admin-banner-error {
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.banner-close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
}

.admin-filters-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-search {
  flex: 2;
  min-width: 220px;
}

.filter-status {
  flex: 1;
  min-width: 160px;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.admin-loading,
.admin-empty {
  padding: 2rem;
  text-align: center;
}

.spinner-box {
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  color: var(--color-primary-700);
}

.empty-title {
  font-family: var(--font-heading, monospace);
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.empty-subtitle {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

/* Desktop Table */
.desktop-table-container {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.admin-table thead tr {
  border-bottom: 2px solid var(--color-border);
  background-color: var(--color-primary-50);
}

.admin-table th {
  padding: 0.75rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-primary-800);
}

.admin-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.pending-row {
  background-color: #fffbeb;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-cell-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: bold;
  color: var(--color-primary-900);
}

.user-handle {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.actions-cell {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}

.impersonate-btn {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  background-color: #fef08a;
  border-color: #ca8a04;
  color: #854d0e;
}
.impersonate-btn:hover {
  background-color: #fde047;
}

.approve-btn {
  background-color: #f0fdf4;
  border-color: #22c55e;
  color: #15803d;
}
.approve-btn:hover {
  background-color: #dcfce7;
}

/* Mobile Cards */
.mobile-cards-container {
  display: none;
}

.user-mobile-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-pending {
  background-color: #fffdf5;
  border-color: #fde68a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.card-user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.card-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.admin-pagination {
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.page-btn {
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .desktop-table-container {
    display: none;
  }

  .mobile-cards-container {
    display: block;
  }

  .admin-filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions {
    margin-bottom: 0;
  }
}
</style>

