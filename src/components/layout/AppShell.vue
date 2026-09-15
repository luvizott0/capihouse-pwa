<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useEventsStore } from '@/stores/events'
import { useNotificationsStore } from '@/stores/notifications'
import Marquee from './Marquee.vue'
import NavMenu from './NavMenu.vue'
import SearchBar from './SearchBar.vue'
import OnlineSidebar from '@/components/sidebar/OnlineSidebar.vue'
import EventsSidebar from '@/components/sidebar/EventsSidebar.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import EventCreateModal from '@/components/events/EventCreateModal.vue'
import RetroModal from '@/components/ui/RetroModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const eventsStore = useEventsStore()
const notificationsStore = useNotificationsStore()

onMounted(() => {
  notificationsStore.startPolling()
})

onUnmounted(() => {
  notificationsStore.stopPolling()
})

const showPostModal = ref(false)
const showEventModal = ref(false)
const showMobileUsersDrawer = ref(false)

function handleStopImpersonating() {
  authStore.stopImpersonating()
  router.push('/feed')
}

function onPostCreated() {
  feedStore.fetchPosts(1)
}

function onEventCreated() {
  eventsStore.fetchEvents(1)
  eventsStore.fetchUpcoming()
}
</script>

<template>
  <div class="layout-shell">
    <!-- Impersonation Alert Banner -->
    <div v-if="authStore.isImpersonating" class="impersonate-banner">
      <div class="impersonate-banner-content">
        <span class="impersonate-badge">🎭 MODO IMPERSONATE</span>
        <span class="impersonate-text">
          Conectado como: <strong>{{ authStore.user?.name }}</strong> (@{{ authStore.user?.username }})
        </span>
        <button @click="handleStopImpersonating" class="impersonate-exit-btn">
          [ Sair da Personificação ]
        </button>
      </div>
    </div>

    <!-- Top Header Bar -->
    <header class="top-header">
      <div class="header-main-row">
        <!-- Logo & Brand -->
        <router-link to="/feed" class="brand-link">
          <img src="/capihouse-logo.png" alt="CapiHouse" class="brand-logo" />
          <span class="brand-name">CapiHouse</span>
        </router-link>

        <!-- Marquee Ticker -->
        <div class="header-marquee-box">
          <Marquee :text="`★ Olá, ${authStore.user?.name || 'Visitante'}! ★ Explore o CapiHouse ★ A rede dos amigos da casa ★`" />
        </div>

        <!-- Notification Bell Icon (Top Right) -->
        <router-link
          to="/notifications"
          class="top-notif-link"
          title="Notificações"
          aria-label="Ver notificações"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="top-notif-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span v-if="notificationsStore.unreadCount > 0" class="top-notif-dot"></span>
        </router-link>
      </div>

      <!-- Search & Contextual Action Bar -->
      <SearchBar
        @open-create-post="showPostModal = true"
        @open-create-event="showEventModal = true"
      />

      <!-- Navigation Menu (Desktop tabs) -->
      <NavMenu />
    </header>

    <!-- 3-Column Main Content -->
    <div class="layout-main">
      <!-- Left Sidebar: Events (Desktop only) -->
      <aside class="layout-sidebar-left">
        <EventsSidebar />
      </aside>

      <!-- Center: Main Page Content -->
      <main class="layout-content">
        <router-view />
      </main>

      <!-- Right Sidebar: Online Users (Desktop only) -->
      <aside class="layout-sidebar-right">
        <OnlineSidebar />
      </aside>
    </div>

    <!-- Floating Mobile Users Toggle Button -->
    <button
      type="button"
      class="mobile-users-fab"
      @click="showMobileUsersDrawer = true"
      title="Ver amigos online"
    >
      <span>👥</span> [ Usuários ]
    </button>

    <!-- Mobile Users Drawer Modal -->
    <RetroModal
      v-model="showMobileUsersDrawer"
      title="» Amigos da Casa"
      size="sm"
    >
      <OnlineSidebar />
    </RetroModal>

    <!-- Global Modals -->
    <PostCreateModal
      v-model="showPostModal"
      @created="onPostCreated"
    />

    <EventCreateModal
      v-model="showEventModal"
      @created="onEventCreated"
    />
  </div>
</template>

<style scoped>
.layout-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-app-color, var(--color-primary-50, #f8f6f1));
  background-image: var(--bg-app-image, none);
  background-size: var(--bg-app-size, auto);
  background-repeat: var(--bg-app-repeat, no-repeat);
  background-position: var(--bg-app-position, center);
  background-attachment: fixed;
}

.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: #ffffff;
  border-bottom: 2px solid var(--color-border, #D8CDC5);
}

.header-main-row {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  flex-shrink: 0;
}
.brand-link:hover {
  text-decoration: none;
}

.brand-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
}

.header-marquee-box {
  flex: 1;
  overflow: hidden;
  max-width: 70%;
}

.top-notif-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background-color: var(--color-primary-50, #f8f6f1);
  color: var(--color-primary-800, #5f4120);
  text-decoration: none;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.top-notif-link:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
  color: var(--color-primary);
  text-decoration: none;
}
.top-notif-icon {
  width: 20px;
  height: 20px;
}
.top-notif-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 9px;
  height: 9px;
  background-color: var(--color-primary, #a66130);
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.layout-main {
  display: flex;
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1.25rem 1rem 2rem;
  gap: 1.25rem;
}

.layout-sidebar-left,
.layout-sidebar-right {
  width: 260px;
  flex-shrink: 0;
}

.layout-content {
  flex: 1;
  min-width: 0;
}

/* Floating Action Button on mobile for Users */
.mobile-users-fab {
  display: none;
}

@media (max-width: 768px) {
  .header-marquee-box {
    display: none;
  }

  .layout-main {
    padding: 0.75rem 0.75rem 6rem; /* Extra padding at bottom to never hide content under mobile bottom nav */
  }

  .layout-sidebar-left,
  .layout-sidebar-right {
    display: none;
  }

  .mobile-users-fab {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    position: fixed;
    bottom: 4.8rem;
    right: 1rem;
    z-index: 900;
    background-color: var(--color-primary, #a66130);
    color: #ffffff;
    font-family: var(--font-heading, 'Space Mono', monospace);
    font-size: 0.75rem;
    font-weight: bold;
    padding: 0.5rem 0.8rem;
    border: 2px solid var(--color-primary-800);
    border-radius: 2px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
  .mobile-users-fab:active {
    transform: scale(0.96);
  }
}

.impersonate-banner {
  background-color: #fef08a;
  border-bottom: 2px solid #ca8a04;
  color: #713f12;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.impersonate-banner-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.impersonate-badge {
  background-color: #ca8a04;
  color: #ffffff;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
}

.impersonate-text {
  flex: 1;
  font-family: var(--font-body, 'Outfit', sans-serif);
}

.impersonate-exit-btn {
  background-color: #854d0e;
  color: #ffffff;
  border: 1px solid #713f12;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.impersonate-exit-btn:hover {
  background-color: #713f12;
}
</style>
