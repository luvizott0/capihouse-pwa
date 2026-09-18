<script setup lang="ts">
defineOptions({
  name: 'GroupsView'
})

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import GroupCardSkeleton from '@/components/groups/GroupCardSkeleton.vue'
import GroupCreateModal from '@/components/groups/GroupCreateModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()
const showCreateModal = ref(false)

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(() => loadGroups(true))

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => route.query.user_id ? Number(route.query.user_id) : null)

async function loadGroups(force = false) {
  if (!force && !hasSearchFilters.value && (groupsStore.hasLoaded || groupsStore.myGroups.length > 0)) {
    return
  }

  await groupsStore.fetchMyGroups({
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    userId: filterUserId.value || undefined,
  })
}

watch(
  () => [
    route.name,
    route.query.q,
    route.query.search,
    route.query.date,
    route.query.user_id,
  ],
  ([name, q, search, date, userId], [, oldQ, oldSearch, oldDate, oldUserId]) => {
    if (name !== 'groups') return
    if (q !== oldQ || search !== oldSearch || date !== oldDate || userId !== oldUserId) {
      loadGroups(true)
    }
  }
)

function clearSearch() {
  router.push({ path: '/groups' })
}

onMounted(async () => {
  await loadGroups()
})

onUnmounted(() => {
  groupsStore.clearFilters()
})

function onGroupCreated() {
  loadGroups(true)
}
</script>

<template>
  <div
    class="groups-view-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator box -->
    <PullToRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshingFromPull"
      refreshing-text="Atualizando grupos..."
    />

    <!-- Header -->
    <div class="groups-header-line">
      <h2 class="section-marker">» {{ hasSearchFilters ? 'Grupos Encontrados' : 'Meus Grupos' }}</h2>
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

    <!-- Search Results Banner -->
    <div v-if="hasSearchFilters" class="search-filter-banner">
      <div class="search-filter-info">
        <span class="search-filter-title">🔍 Filtro de grupos:</span>
        <span v-if="searchTerms" class="search-tag">Texto: "{{ searchTerms }}"</span>
        <span v-if="filterDate" class="search-tag">Data: {{ filterDate }}</span>
        <span v-if="filterUserId" class="search-tag">Criador ID: {{ filterUserId }}</span>
      </div>
      <button type="button" class="clear-search-link" @click="clearSearch">
        [✕ Limpar busca]
      </button>
    </div>

    <!-- Loading State com Skeletons Shimmer -->
    <div v-if="groupsStore.isLoading && groupsStore.myGroups.length === 0" class="groups-grid">
      <GroupCardSkeleton v-for="i in 4" :key="i" />
    </div>

    <!-- User's Groups Grid -->
    <div v-else-if="groupsStore.myGroups.length" class="groups-grid">
      <router-link
        v-for="group in groupsStore.myGroups"
        :key="group.id"
        :to="`/groups/${group.id}`"
        class="group-card"
        :class="{ 'has-unread': (group.unread_messages_count ?? 0) > 0 }"
      >
        <div class="group-photo-box">
          <img
            v-if="group.image_url"
            :src="group.image_url"
            :alt="group.name"
            class="group-photo-img"
          />
          <span v-else class="group-photo-fallback">👥</span>
        </div>

        <div class="group-info">
          <div class="group-title-row">
            <span class="group-name" :title="group.name">{{ group.name }}</span>
            <span v-if="group.my_role === 'owner'" class="group-role-badge">[ Dono ]</span>
            <span v-else class="group-role-badge">[ Membro ]</span>
          </div>

          <div class="group-meta-row">
            <span class="members-count">👥 {{ group.members_count }} {{ group.members_count === 1 ? 'membro' : 'membros' }}</span>
            <span v-if="(group.unread_messages_count ?? 0) > 0" class="unread-indicator-badge">
              <span class="unread-dot">●</span>
              {{ group.unread_messages_count }} {{ group.unread_messages_count === 1 ? 'nova' : 'novas' }}
            </span>
          </div>

          <div class="group-footer">
            <span class="open-group-link">Entrar no grupo &raquo;</span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Final dos Grupos -->
    <div v-if="groupsStore.myGroups.length" class="infinite-end-card">
      <span class="end-marker">👥</span>
      <span class="end-text">Você está visualizando todos os seus grupos da casa!</span>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-groups-box">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhum grupo encontrado' : 'Você ainda não participa de nenhum grupo' }}</h3>
      <p class="empty-subtitle">
        {{ hasSearchFilters ? 'Nenhum grupo correspondeu aos filtros de busca aplicados.' : 'Os grupos no CapiHouse funcionam apenas por convite. Crie o seu próprio grupo para reunir os amigos da casa ou aguarde um convite!' }}
      </p>
      <div class="empty-actions">
        <button v-if="hasSearchFilters" type="button" class="btn-clear-empty" @click="clearSearch">
          [ Limpar busca ]
        </button>
        <RetroButton v-else @click="showCreateModal = true">
          + Criar Primeiro Grupo
        </RetroButton>
      </div>
    </div>

    <!-- Create Group Modal -->
    <GroupCreateModal
      v-model="showCreateModal"
      @created="onGroupCreated"
    />
  </div>
</template>

<style scoped>
.groups-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.groups-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.section-marker {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  padding: 0.3rem 0.6rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}
.refresh-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  border-color: #ffffff;
  color: #ffffff;
}
.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.refresh-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 0.8s linear infinite;
}

/* Search Results Banner */
.search-filter-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: var(--color-primary-50, #FFFBF7);
  border: 1px dashed var(--color-primary, #6B3E26);
  border-radius: 2px;
  padding: 0.6rem 0.8rem;
  font-family: var(--font-body, monospace);
  font-size: 0.82rem;
}

.search-filter-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.search-filter-title {
  font-weight: bold;
  color: var(--color-primary-900, #3E2723);
}

.search-tag {
  background-color: var(--color-primary-100, #F5EBE1);
  border: 1px solid var(--color-border, #D8CDC5);
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  font-weight: bold;
  color: var(--color-primary-800, #3E2723);
}

.clear-search-link {
  background: none;
  border: none;
  color: #c62828;
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.clear-search-link:hover {
  color: #b71c1c;
}

.btn-clear-empty {
  background-color: var(--color-primary, #6B3E26);
  color: white;
  border: none;
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
}
.btn-clear-empty:hover {
  background-color: var(--color-primary-600, #54311e);
}

.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.85rem;
}

.group-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.08);
  border-color: var(--color-primary, #a66130);
}

.group-card.has-unread {
  border-color: var(--color-primary, #a66130);
  background-color: #fdfaf7;
  box-shadow: 0 1px 4px rgba(166, 97, 48, 0.12);
}

.group-photo-box {
  width: 76px;
  height: 76px;
  min-width: 76px;
  min-height: 76px;
  background-color: var(--color-primary-100, #faede0);
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.group-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-photo-fallback {
  font-size: 2rem;
  opacity: 0.55;
}

.group-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.group-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.group-name {
  font-family: var(--font-heading);
  font-weight: bold;
  font-size: 0.95rem;
  color: var(--color-primary-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-role-badge {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--color-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.group-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.78rem;
  font-family: var(--font-heading);
}

.members-count {
  color: var(--color-muted);
}

.unread-indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #fbeee4;
  color: #7c2d12;
  border: 1px solid #ea580c;
  border-radius: 2px;
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-heading);
}

.unread-dot {
  color: #ea580c;
  font-size: 0.65rem;
}

.group-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 0.75rem;
  font-family: var(--font-heading);
  padding-top: 0.2rem;
  border-top: 1px dashed var(--color-primary-50, #f8f6f1);
}

.open-group-link {
  color: var(--color-primary);
  font-weight: bold;
  font-size: 0.75rem;
}

.empty-groups-box {
  background-color: #ffffff;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
.empty-icon {
  font-size: 3.5rem;
}
.empty-title {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  color: var(--color-primary-800);
}
.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted);
  max-width: 420px;
}
.empty-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.infinite-end-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  text-align: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #5f4120;
  background-color: #fdf8f3;
  border: 1px solid #e8c9a5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(62, 39, 35, 0.08);
  margin-top: 0.75rem;
  margin-bottom: 1rem;
}

.end-marker {
  font-size: 1rem;
}
</style>
