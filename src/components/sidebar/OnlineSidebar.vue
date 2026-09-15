<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import OnlineIndicator from '@/components/ui/OnlineIndicator.vue'

const usersStore = useUsersStore()
const authStore = useAuthStore()

onMounted(() => {
  usersStore.startPolling()
})
onUnmounted(() => {
  usersStore.stopPolling()
})

const displayUsers = computed(() => {
  const currentId = authStore.user?.id
  const list = usersStore.allUsers.length > 0 ? usersStore.allUsers : usersStore.onlineUsers
  return list
    .filter(u => u.id !== currentId)
    .sort((a, b) => {
      if (a.is_online === b.is_online) return a.name.localeCompare(b.name)
      return a.is_online ? -1 : 1
    })
})
</script>

<template>
  <div class="retro-card">
    <div class="retro-card-header">
      » Amigos da Casa
    </div>
    <div style="padding: 0.75rem; max-height: 450px; overflow-y: auto;">
      <div v-if="usersStore.isLoading && displayUsers.length === 0" class="empty-text">Carregando membros...</div>
      <div v-else-if="displayUsers.length === 0" class="empty-text">Nenhum membro encontrado.</div>
      <router-link 
        v-for="user in displayUsers" 
        :key="user.id" 
        :to="`/profile/${user.username}`"
        class="online-user-item"
      >
        <div style="position: relative; flex-shrink: 0;">
          <UserAvatar :user="user" size="sm" />
          <OnlineIndicator :isOnline="!!user.is_online" style="position: absolute; bottom: -2px; right: -2px;" />
        </div>
        <div class="user-info">
          <span class="user-name">{{ user.name }}</span>
          <span class="user-username">@{{ user.username }}</span>
        </div>
        <span class="status-pill" :class="user.is_online ? 'pill-online' : 'pill-offline'">
          {{ user.is_online ? 'Online' : 'Offline' }}
        </span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.online-user-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.3rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--text-main);
  border-radius: 2px;
  text-decoration: none;
}
.online-user-item:last-child { border-bottom: none; }
.online-user-item:hover { background-color: var(--color-primary-50); text-decoration: none; }

.user-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
.user-name { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-username { font-size: 0.72rem; color: var(--color-muted, #847062); font-family: var(--font-heading, monospace); }

.status-pill {
  font-size: 0.65rem;
  font-family: var(--font-heading, monospace);
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: bold;
  flex-shrink: 0;
}
.pill-online {
  color: #15803d;
  background-color: #dcfce7;
}
.pill-offline {
  color: #9ca3af;
  background-color: #f3f4f6;
}

.empty-text {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
  text-align: center;
  padding: 1rem 0;
}
</style>
