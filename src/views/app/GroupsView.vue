<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGroupsStore } from '@/stores/groups'
import GroupCreateModal from '@/components/groups/GroupCreateModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const groupsStore = useGroupsStore()
const showCreateModal = ref(false)

onMounted(async () => {
  await loadGroups()
})

async function loadGroups() {
  await groupsStore.fetchMyGroups()
}

function onGroupCreated() {
  loadGroups()
}
</script>

<template>
  <div class="groups-view-container">
    <!-- Header with Action -->
    <div class="groups-header-line">
      <h2 class="section-marker">Meus Grupos</h2>
      <RetroButton @click="showCreateModal = true">
        + Criar Grupo
      </RetroButton>
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
      <h3 class="empty-title">Você ainda não participa de nenhum grupo</h3>
      <p class="empty-subtitle">
        Os grupos no CapiHouse funcionam apenas por convite. Crie o seu próprio grupo para reunir os amigos da casa ou aguarde um convite!
      </p>
      <div class="empty-actions">
        <RetroButton @click="showCreateModal = true">
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
  gap: 0.75rem;
  padding: 0.85rem;
  background-color: #ffffff;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  text-decoration: none;
  color: inherit;
  transition: all 0.15s ease;
}
.group-card:hover {
  border-color: var(--color-primary-400);
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.group-photo-box {
  width: 64px;
  height: 64px;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  background-color: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.group-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.group-photo-fallback {
  font-size: 1.75rem;
}

.group-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
}

.group-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.35rem;
}

.group-name {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-800);
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
