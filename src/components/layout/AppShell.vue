<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useEventsStore } from '@/stores/events'
import Marquee from './Marquee.vue'
import NavMenu from './NavMenu.vue'
import SearchBar from './SearchBar.vue'
import OnlineSidebar from '@/components/sidebar/OnlineSidebar.vue'
import EventsSidebar from '@/components/sidebar/EventsSidebar.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import EventCreateModal from '@/components/events/EventCreateModal.vue'
import RetroModal from '@/components/ui/RetroModal.vue'

const authStore = useAuthStore()
const feedStore = useFeedStore()
const eventsStore = useEventsStore()

const showPostModal = ref(false)
const showEventModal = ref(false)
const showMobileUsersDrawer = ref(false)

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
  background-color: var(--color-primary-50, #f8f6f1);
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
</style>
