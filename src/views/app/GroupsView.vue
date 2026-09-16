<script setup lang="ts">
defineOptions({
  name: 'GroupsView'
})

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import GroupCreateModal from '@/components/groups/GroupCreateModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const groupsStore = useGroupsStore()
const showCreateModal = ref(false)

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => route.query.user_id ? Number(route.query.user_id) : null)

async function loadGroups(force = false) {
  if (!force && !hasSearchFilters.value && groupsStore.myGroups.length > 0) {
    return
  }

  await groupsStore.fetchMyGroups({
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    userId: filterUserId.value || undefined,
  })
}

watch(
  () => route.query,
  () => {
    loadGroups(true)
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
  <div class="groups-view-container">
    <!-- Header -->
    <div class="groups-header-line">
      <h2 class="section-marker">» {{ hasSearchFilters ? 'Grupos Encontrados' : 'Meus Grupos' }}</h2>
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

    <!-- Loading State -->
    <div v-if="groupsStore.isLoading && groupsStore.myGroups.length === 0" class="loading-state">
      Carregando seus grupos...
    </div>

    <!-- User's Groups Grid -->
    <div v-else-if="groupsStore.myGroups.length" class="groups-grid">
      <router-link
        v-for="group in groupsStore.myGroups"
        :key="group.id"
        :to="`/groups/${group.id}`"
        class="group-card"
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
            <span class="group-name">{{ group.name }}</span>
            <span v-if="group.my_role === 'owner'" class="group-role-badge">[ Dono ]</span>
            <span v-else class="group-role-badge">[ Membro ]</span>
          </div>

          <p class="group-desc">{{ group.description || 'Sem descrição.' }}</p>

          <div class="group-footer">
            <span class="members-count">👥 {{ group.members_count }} {{ group.members_count === 1 ? 'membro' : 'membros' }}</span>
            <span class="open-group-link">Entrar no grupo &raquo;</span>
          </div>
        </div>
      </router-link>
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.group-card {
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.08);
  border-color: var(--color-primary);
}

.group-photo-box {
  width: 100%;
  height: 120px;
  background-color: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.group-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-photo-fallback {
  font-size: 2.5rem;
  opacity: 0.5;
}

.group-info {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
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
}

.group-desc {
  font-size: 0.8rem;
  color: var(--color-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.group-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  font-family: var(--font-heading);
  padding-top: 0.25rem;
  border-top: 1px solid var(--color-primary-50);
}

.members-count {
  color: var(--color-muted);
}

.open-group-link {
  color: var(--color-primary);
  font-weight: bold;
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
</style>
