<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import OnlineIndicator from '@/components/ui/OnlineIndicator.vue'
import type { User } from '@/types/models'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()
const usersStore = useUsersStore()
const authStore = useAuthStore()

const searchQuery = ref('')

onMounted(() => {
  usersStore.startPolling()
})

onUnmounted(() => {
  usersStore.stopPolling()
})

function close() {
  emit('update:modelValue', false)
}

function goToProfile(username: string) {
  close()
  router.push(`/profile/${username}`)
}

// Filter out current logged-in user from general list so they stay in their dedicated preview section
const otherUsers = computed(() => {
  const currentId = authStore.user?.id
  const list = usersStore.allUsers.length > 0 ? usersStore.allUsers : usersStore.onlineUsers
  return list.filter(u => u.id !== currentId)
})

// Filter by search and sort: online users first, then offline alphabetically
const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let list = otherUsers.value

  if (query) {
    list = list.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    )
  }

  return [...list].sort((a, b) => {
    if (a.is_online === b.is_online) {
      return a.name.localeCompare(b.name)
    }
    return a.is_online ? -1 : 1
  })
})

const onlineCount = computed(() => otherUsers.value.filter(u => u.is_online).length)
const offlineCount = computed(() => otherUsers.value.filter(u => !u.is_online).length)
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop Overlay -->
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="sidebar-backdrop"
        @click="close"
      ></div>
    </Transition>

    <!-- Slide-over Drawer -->
    <Transition name="slide">
      <aside
        v-if="modelValue"
        class="mobile-sidebar-drawer"
        role="dialog"
        aria-label="Amigos da Casa"
      >
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-brand">
            <span class="header-icon">👥</span>
            <span class="header-title">» Amigos da Casa</span>
          </div>
          <button
            type="button"
            class="close-btn"
            aria-label="Fechar"
            @click="close"
          >
            [X]
          </button>
        </div>

        <!-- Scrollable Content Body -->
        <div class="drawer-body">

          <!-- ── Section 1: Self Profile Preview (Separated) ── -->
          <div class="self-preview-section">
            <div class="section-label">
              <span>👤 COMO VOCÊ APARECE</span>
              <span class="preview-tag">[ Pré-visualização ]</span>
            </div>

            <div class="self-card" v-if="authStore.user">
              <div class="self-avatar-wrap">
                <UserAvatar :user="authStore.user" size="md" />
                <OnlineIndicator :isOnline="true" class="self-online-dot" />
              </div>

              <div class="self-info">
                <div class="self-name-row">
                  <span class="self-name">{{ authStore.user.name }}</span>
                  <span class="you-badge">[ Você ]</span>
                </div>
                <span class="self-username">@{{ authStore.user.username }}</span>
                <span class="self-status-text">🟢 Online no CapiHouse</span>
              </div>
            </div>

            <p class="self-hint">
              Este é o seu visual para os outros membros da casa.
            </p>
          </div>

          <div class="drawer-divider"></div>

          <!-- ── Section 2: Other Users List ── -->
          <div class="users-list-section">
            <div class="section-header-row">
              <span class="section-title">» MEMBROS DA CASA</span>
              <div class="counts-badges">
                <span class="count-badge count-online" title="Usuários online">
                  {{ onlineCount }} online
                </span>
                <span class="count-badge count-offline" title="Usuários offline">
                  {{ offlineCount }} offline
                </span>
              </div>
            </div>

            <!-- Quick Search Input -->
            <div class="search-input-wrap">
              <input
                v-model="searchQuery"
                type="text"
                class="drawer-search"
                placeholder="Buscar amigo pelo nome..."
              />
              <span v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</span>
            </div>

            <!-- Loading State -->
            <div v-if="usersStore.isLoading && otherUsers.length === 0" class="drawer-state-msg">
              Carregando lista de amigos...
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredUsers.length === 0" class="drawer-state-msg">
              <p v-if="searchQuery">Nenhum membro encontrado com "{{ searchQuery }}".</p>
              <p v-else>Nenhum outro usuário cadastrado no momento.</p>
            </div>

            <!-- Users Stream -->
            <div v-else class="users-stream">
              <div
                v-for="user in filteredUsers"
                :key="user.id"
                class="user-row"
                @click="goToProfile(user.username)"
              >
                <div class="user-avatar-wrap">
                  <UserAvatar :user="user" size="sm" />
                  <OnlineIndicator
                    :isOnline="!!user.is_online"
                    class="user-online-dot"
                  />
                </div>

                <div class="user-details">
                  <span class="user-full-name">{{ user.name }}</span>
                  <span class="user-handle">@{{ user.username }}</span>
                </div>

                <div class="user-status-col">
                  <span
                    class="status-pill"
                    :class="user.is_online ? 'pill-online' : 'pill-offline'"
                  >
                    {{ user.is_online ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  z-index: 9998;
  backdrop-filter: blur(2px);
}

/* ── Drawer Frame ── */
.mobile-sidebar-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 88%;
  max-width: 340px;
  height: 100vh;
  background-color: #ffffff;
  border-left: 2px solid var(--color-primary-800, #5f4120);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.drawer-header {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  padding: 0.65rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.header-icon {
  font-size: 1rem;
}

.header-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.9rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-family: var(--font-heading, monospace);
  font-weight: bold;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  line-height: 1;
  border-radius: 2px;
}
.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* ── Drawer Body ── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-width: thin;
}

/* ── Section 1: Self Preview ── */
.self-preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.preview-tag {
  font-size: 0.65rem;
  color: var(--color-muted, #847062);
  font-weight: normal;
}

.self-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 2px solid var(--color-primary-200, #e8c9a5);
  border-radius: 2px;
  padding: 0.65rem 0.75rem;
}

.self-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.self-online-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
}

.self-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.self-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.self-name {
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: #181818;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.you-badge {
  font-size: 0.65rem;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  padding: 0.05rem 0.3rem;
  border-radius: 2px;
  font-family: monospace;
}

.self-username {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  color: var(--color-primary, #a66130);
}

.self-status-text {
  font-size: 0.7rem;
  color: #15803d;
  font-weight: 500;
  margin-top: 0.1rem;
}

.self-hint {
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  font-style: italic;
}

.drawer-divider {
  border-top: 1px solid var(--color-border, #D8CDC5);
}

/* ── Section 2: Other Users ── */
.users-list-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.counts-badges {
  display: flex;
  gap: 0.3rem;
}

.count-badge {
  font-size: 0.65rem;
  font-family: var(--font-heading, monospace);
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  font-weight: bold;
}

.count-online {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.count-offline {
  background-color: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

/* ── Search Input ── */
.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.drawer-search {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-family: var(--font-body, sans-serif);
  font-size: 0.8rem;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background-color: #fdfdfd;
  outline: none;
}
.drawer-search:focus {
  border-color: var(--color-primary, #a66130);
  background-color: #ffffff;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  font-size: 0.75rem;
  color: #888888;
  cursor: pointer;
  padding: 0.2rem;
}

/* ── Users Stream ── */
.users-stream {
  display: flex;
  flex-direction: column;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.3rem;
  border-bottom: 1px solid #f0ebe6;
  cursor: pointer;
  transition: background-color 0.12s;
  border-radius: 2px;
}
.user-row:hover {
  background-color: var(--color-primary-50, #f8f6f1);
}

.user-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.user-online-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
}

.user-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-full-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #222222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-handle {
  font-family: var(--font-heading, monospace);
  font-size: 0.72rem;
  color: var(--color-muted, #847062);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-status-col {
  flex-shrink: 0;
}

.status-pill {
  font-size: 0.65rem;
  font-family: var(--font-heading, monospace);
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  font-weight: bold;
}
.pill-online {
  color: #15803d;
  background-color: #dcfce7;
}
.pill-offline {
  color: #9ca3af;
  background-color: #f3f4f6;
}

.drawer-state-msg {
  padding: 1.5rem 0.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
