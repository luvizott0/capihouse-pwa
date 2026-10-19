<script setup lang="ts">
defineOptions({
  name: 'GroupsView'
})

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import type { Group } from '@/types/models'
import GroupCardSkeleton from '@/components/groups/GroupCardSkeleton.vue'
import GroupCreateModal from '@/components/groups/GroupCreateModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()

const showCreateModal = ref(false)
const groupToEdit = ref<Group | null>(null)

const showDeleteModal = ref(false)
const groupToDelete = ref<Group | null>(null)
const isDeleting = ref(false)

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(() => loadGroups(true))

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})

async function loadGroups(force = false) {
  if (!force && !hasSearchFilters.value && (groupsStore.hasLoaded || groupsStore.myGroups.length > 0)) {
    return
  }

  await groupsStore.fetchMyGroups({
    search: searchTerms.value || undefined,
  })
}

watch(
  () => [route.name, route.query.q, route.query.search],
  ([name, q, search], [, oldQ, oldSearch]) => {
    if (name !== 'groups') return
    if (q !== oldQ || search !== oldSearch) {
      loadGroups(true)
    }
  }
)

function clearSearch() {
  router.push({ path: '/groups' })
}

function openCreateModal() {
  groupToEdit.value = null
  showCreateModal.value = true
}

function openEditModal(group: Group) {
  groupToEdit.value = group
  showCreateModal.value = true
}

function confirmDelete(group: Group) {
  groupToDelete.value = group
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!groupToDelete.value) return
  isDeleting.value = true
  try {
    await groupsStore.deleteGroup(groupToDelete.value.id)
    showDeleteModal.value = false
    groupToDelete.value = null
  } catch (err) {
    console.error('Erro ao excluir grupo:', err)
  } finally {
    isDeleting.value = false
  }
}

function onGroupSaved() {
  loadGroups(true)
}

onMounted(async () => {
  await loadGroups()
})

onUnmounted(() => {
  groupsStore.clearFilters()
})
</script>

<template>
  <div
    class="groups-view-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator -->
    <PullToRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshingFromPull"
      refreshing-text="Atualizando grupos..."
    />

    <!-- Header line -->
    <div class="groups-header-line">
      <div class="header-left">
        <h2 class="section-marker">» Meus Grupos de Filtro</h2>
      </div>
      <div class="header-actions">
        <RetroButton size="sm" @click="openCreateModal">
          + Novo Grupo
        </RetroButton>
        <button
          type="button"
          class="refresh-btn"
          :class="{ 'is-refreshing': groupsStore.isLoading }"
          :disabled="groupsStore.isLoading"
          @click="loadGroups(true)"
          title="Recarregar grupos"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="refresh-icon"
            :class="{ 'spin': groupsStore.isLoading }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Explanatory info card -->
    <div class="groups-guide-card">
      <div class="guide-icon">🎯</div>
      <div class="guide-body">
        <div class="guide-title">Como funcionam os grupos no CapiHouse?</div>
        <p class="guide-text">
          Seus grupos são <strong>filtros privados de audiência</strong>. Nenhum outro usuário sabe que esses grupos existem. Ao criar uma publicação, você pode escolher se deseja deixá-la pública ou visível apenas para os amigos que você adicionou a um grupo específico.
        </p>
      </div>
    </div>

    <!-- Search Results Banner -->
    <div v-if="hasSearchFilters" class="search-filter-banner">
      <div class="search-filter-info">
        <span class="search-filter-title">🔍 Filtro de grupos:</span>
        <span v-if="searchTerms" class="search-tag">Texto: "{{ searchTerms }}"</span>
      </div>
      <button type="button" class="clear-search-link" @click="clearSearch">
        [✕ Limpar busca]
      </button>
    </div>

    <!-- Loading State with Skeletons -->
    <div v-if="groupsStore.isLoading && groupsStore.myGroups.length === 0" class="groups-grid">
      <GroupCardSkeleton v-for="i in 3" :key="i" />
    </div>

    <!-- Groups Grid -->
    <div v-else-if="groupsStore.myGroups.length" class="groups-grid">
      <div
        v-for="group in groupsStore.myGroups"
        :key="group.id"
        class="audience-group-card"
        :style="{ borderLeftColor: group.color || '#a66130' }"
      >
        <div class="card-header">
          <div class="group-title-wrapper">
            <span class="group-color-dot" :style="{ backgroundColor: group.color || '#a66130' }"></span>
            <h3 class="group-name" :title="group.name">{{ group.name }}</h3>
          </div>

          <div class="card-action-buttons">
            <button
              type="button"
              class="card-btn edit-btn"
              title="Editar grupo"
              @click="openEditModal(group)"
            >
              ✏️ Editar
            </button>
            <button
              type="button"
              class="card-btn delete-btn"
              title="Excluir grupo"
              @click="confirmDelete(group)"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="members-status-row">
            <span class="members-badge">
              👥 {{ group.members?.length ?? group.members_count ?? 0 }} {{ (group.members?.length ?? group.members_count ?? 0) === 1 ? 'pessoa com acesso' : 'pessoas com acesso' }}
            </span>
          </div>

          <!-- Members Avatars Preview -->
          <div v-if="group.members && group.members.length" class="members-avatars-row">
            <div class="avatar-stack">
              <div
                v-for="member in group.members.slice(0, 6)"
                :key="member.id"
                class="stacked-avatar"
                :title="member.name"
              >
                <UserAvatar :user="member" size="sm" />
              </div>
              <div v-if="group.members.length > 6" class="avatar-overflow-badge">
                +{{ group.members.length - 6 }}
              </div>
            </div>
            <div class="member-names-summary">
              {{ group.members.slice(0, 3).map(m => m.name.split(' ')[0]).join(', ') }}{{ group.members.length > 3 ? ' e outros' : '' }}
            </div>
          </div>
          <div v-else class="empty-members-hint">
            Nenhuma pessoa adicionada ainda. Clique em "Editar" para adicionar amigos a este filtro.
          </div>
        </div>

        <div class="card-footer">
          <span class="visibility-hint">
            🔒 Exclusivo: posts enviados para este grupo só aparecerão no feed dessas pessoas.
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-groups-box">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhum grupo encontrado' : 'Você ainda não criou nenhum grupo de filtro' }}</h3>
      <p class="empty-subtitle">
        {{ hasSearchFilters ? 'Nenhum grupo correspondeu aos filtros de busca aplicados.' : 'Crie grupos como "Melhores Amigos", "Família" ou "Música" para publicar conteúdos que apenas essas pessoas poderão ver.' }}
      </p>
      <div class="empty-actions">
        <button v-if="hasSearchFilters" type="button" class="btn-clear-empty" @click="clearSearch">
          [ Limpar busca ]
        </button>
        <RetroButton v-else @click="openCreateModal">
          + Criar Meu Primeiro Grupo
        </RetroButton>
      </div>
    </div>

    <!-- Create / Edit Group Modal -->
    <GroupCreateModal
      v-model="showCreateModal"
      :group="groupToEdit"
      @created="onGroupSaved"
      @updated="onGroupSaved"
    />

    <!-- Delete Confirmation Modal -->
    <RetroConfirmModal
      v-model="showDeleteModal"
      title="Excluir Grupo de Filtro"
      :message="`Tem certeza que deseja excluir o grupo '${groupToDelete?.name}'? Publicações antigas feitas com este filtro deixarão de ficar vinculadas a ele.`"
      confirm-text="Excluir Grupo"
      cancel-text="Cancelar"
      :loading="isDeleting"
      variant="danger"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.groups-view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.groups-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
}

.section-marker {
  font-family: var(--font-heading, monospace);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.refresh-btn {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--color-primary-600, #c4884e);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: var(--color-primary-100, #f8efe6);
  color: var(--color-primary-900, #38200a);
}

.refresh-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.refresh-icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Guide Card */
.groups-guide-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.85rem 1.1rem;
  background-color: var(--color-primary-50, #fcf9f5);
  border: 2px dashed var(--color-primary-200, #e9d5c2);
  border-radius: 4px;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.04);
}

.guide-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.guide-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.guide-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-primary-900, #38200a);
}

.guide-text {
  margin: 0;
  font-size: 0.85rem;
  color: #554840;
  line-height: 1.45;
}

/* Search Banner */
.search-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 3px;
  font-size: 0.85rem;
}

.search-filter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-filter-title {
  font-weight: bold;
}

.search-tag {
  background-color: var(--color-primary-100, #f8efe6);
  color: var(--color-primary-900, #38200a);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.clear-search-link {
  background: none;
  border: none;
  color: #dc2626;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.8rem;
}

/* Groups Grid */
.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.audience-group-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  border-left-width: 6px;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  padding: 1rem;
  gap: 0.75rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.audience-group-card:hover {
  transform: translateY(-1px);
  box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.09);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid #f3ece5;
  padding-bottom: 0.5rem;
}

.group-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  overflow: hidden;
}

.group-color-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.group-name {
  font-family: var(--font-heading, monospace);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text, #2c2523);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.card-btn {
  background: #ffffff;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s ease;
}

.card-btn.edit-btn:hover {
  background-color: var(--color-primary-100, #f8efe6);
  border-color: var(--color-primary-400, #c4884e);
  color: var(--color-primary-900, #38200a);
}

.card-btn.delete-btn:hover {
  background-color: #fee2e2;
  border-color: #ef4444;
  color: #b91c1c;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.members-status-row {
  display: flex;
  align-items: center;
}

.members-badge {
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 600;
}

.members-avatars-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.stacked-avatar {
  margin-left: -0.45rem;
  border: 2px solid #ffffff;
  border-radius: 50%;
  display: inline-block;
}

.stacked-avatar:first-child {
  margin-left: 0;
}

.avatar-overflow-badge {
  margin-left: -0.45rem;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  background-color: var(--color-primary-200, #e9d5c2);
  color: var(--color-primary-900, #38200a);
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
}

.member-names-summary {
  font-size: 0.8rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-members-hint {
  font-size: 0.8rem;
  color: #9ca3af;
  font-style: italic;
}

.card-footer {
  margin-top: auto;
  border-top: 1px dashed #f3ece5;
  padding-top: 0.5rem;
}

.visibility-hint {
  font-size: 0.75rem;
  color: #78716c;
  line-height: 1.35;
}

/* Empty State */
.empty-groups-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.05);
  text-align: center;
  gap: 0.75rem;
}

.empty-capivara-logo {
  width: 64px;
  height: 64px;
  opacity: 0.8;
}

.empty-title {
  font-family: var(--font-heading, monospace);
  font-size: 1.1rem;
  margin: 0;
  color: var(--color-text, #2c2523);
}

.empty-subtitle {
  max-width: 440px;
  font-size: 0.88rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.45;
}

.empty-actions {
  margin-top: 0.5rem;
}

.btn-clear-empty {
  background: none;
  border: none;
  color: var(--color-primary, #a66130);
  font-weight: bold;
  cursor: pointer;
  font-family: var(--font-heading, monospace);
}
</style>
