<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import OnlineIndicator from '@/components/ui/OnlineIndicator.vue'

const usersStore = useUsersStore()

onMounted(() => {
  usersStore.startPolling()
})
onUnmounted(() => {
  usersStore.stopPolling()
})
</script>
<template>
  <div class="retro-card">
    <div class="retro-card-header">» Amigos da Casa</div>
    <div style="padding: 1rem; max-height: 400px; overflow-y: auto;">
      <div v-if="usersStore.isLoading && usersStore.onlineUsers.length === 0">Carregando...</div>
      <div v-else-if="usersStore.onlineUsers.length === 0">Nenhum usuário online no momento.</div>
      <router-link 
        v-for="user in usersStore.onlineUsers" 
        :key="user.id" 
        :to="`/profile/${user.username}`"
        class="online-user-item"
      >
        <div style="position: relative;">
          <UserAvatar :user="user" size="sm" />
          <OnlineIndicator :isOnline="true" style="position: absolute; bottom: -2px; right: -2px;" />
        </div>
        <span class="user-name">{{ user.name }}</span>
      </router-link>
    </div>
  </div>
</template>
<style scoped>
.online-user-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--text-main);
}
.online-user-item:last-child { border-bottom: none; }
.online-user-item:hover { background-color: var(--color-primary-50); text-decoration: none; }
.user-name { font-size: 0.9rem; font-weight: 500; }
</style>
