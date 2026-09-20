<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { smoothScrollToTop } from '@/utils/scroll'

const route = useRoute()
const authStore = useAuthStore()

function handleNavClick(targetPath: string, e: MouseEvent) {
  let isCurrent = false

  if (targetPath === '/feed') {
    isCurrent = route.path === '/feed' || route.name === 'feed'
  } else if (targetPath === '/entertainment') {
    isCurrent = route.path === '/entertainment' || route.name === 'entertainment'
  } else if (targetPath === '/events') {
    isCurrent = route.path === '/events' || route.name === 'events'
  } else if (targetPath === '/profile') {
    isCurrent =
      route.path === '/profile' ||
      route.name === 'profile' ||
      (route.name === 'user-profile' && route.params.username === authStore.user?.username)
  } else if (targetPath === '/admin/users') {
    isCurrent = route.path === '/admin/users' || route.name === 'admin-users'
  } else {
    isCurrent = route.path === targetPath
  }

  if (isCurrent) {
    e.preventDefault()
    smoothScrollToTop()
  }
}
</script>

<template>
  <div>
    <!-- Desktop Top Navigation Menu -->
    <nav class="desktop-nav">
      <div class="nav-container">
        <div class="nav-tabs">
          <router-link
            to="/feed"
            class="nav-tab"
            active-class="active"
            @click="(e) => handleNavClick('/feed', e)"
          >
            Feed
          </router-link>
          <router-link
            to="/entertainment"
            class="nav-tab"
            active-class="active"
            @click="(e) => handleNavClick('/entertainment', e)"
          >
            Entretenimento
          </router-link>
          <router-link
            to="/events"
            class="nav-tab"
            active-class="active"
            @click="(e) => handleNavClick('/events', e)"
          >
            Eventos
          </router-link>
          <router-link
            to="/profile"
            class="nav-tab"
            active-class="active"
            @click="(e) => handleNavClick('/profile', e)"
          >
            Perfil
          </router-link>
          <router-link
            v-if="authStore.isAdmin"
            to="/admin/users"
            class="nav-tab"
            active-class="active"
            @click="(e) => handleNavClick('/admin/users', e)"
          >
            Admin
          </router-link>
        </div>
        <button type="button" class="btn-logout" @click="authStore.logout">
          [ Sair ]
        </button>
      </div>
    </nav>

    <!-- Mobile Bottom App Navigation Bar -->
    <nav class="mobile-bottom-nav">
      <div class="mobile-nav-grid" :class="{ 'has-admin': authStore.isAdmin }">
        <!-- Feed Tab -->
        <router-link
          to="/feed"
          class="mobile-tab"
          active-class="active"
          @click="(e) => handleNavClick('/feed', e)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span class="tab-label">Feed</span>
        </router-link>

        <!-- Entertainment Tab -->
        <router-link
          to="/entertainment"
          class="mobile-tab"
          active-class="active"
          @click="(e) => handleNavClick('/entertainment', e)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <span class="tab-label">Entretenimento</span>
        </router-link>

        <!-- Events Tab -->
        <router-link
          to="/events"
          class="mobile-tab"
          active-class="active"
          @click="(e) => handleNavClick('/events', e)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="tab-label">Eventos</span>
        </router-link>

        <!-- Profile Tab -->
        <router-link
          to="/profile"
          class="mobile-tab"
          active-class="active"
          @click="(e) => handleNavClick('/profile', e)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="tab-label">Perfil</span>
        </router-link>

        <!-- Admin Tab (Only if admin) -->
        <router-link
          v-if="authStore.isAdmin"
          to="/admin/users"
          class="mobile-tab"
          active-class="active"
          @click="(e) => handleNavClick('/admin/users', e)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="tab-label">Admin</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<style scoped>
/* Desktop Navigation */
.desktop-nav {
  display: block;
  background-color: var(--color-primary-100, #fdf8f3);
  border-bottom: 2px solid var(--color-border, #D8CDC5);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

.nav-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.nav-tab {
  padding: 0.5rem 1rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary-700, #7d5628);
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  text-decoration: none;
  transition: all 0.15s ease;
}
.nav-tab:hover {
  background-color: var(--color-primary-200, #e8c9a5);
  color: var(--color-primary-900);
  text-decoration: none;
}
.nav-tab.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary, #a66130);
}

.btn-logout {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-danger, #ef4444);
  cursor: pointer;
  padding: 0.4rem 0.6rem;
}
.btn-logout:hover {
  text-decoration: underline;
}

/* Mobile Bottom Navigation */
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }

  .mobile-bottom-nav {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #ffffff;
    border-top: 2px solid var(--color-primary-200, #e8c9a5);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
    z-index: 1000;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .mobile-nav-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: 60px;
  }

  .mobile-nav-grid.has-admin {
    grid-template-columns: repeat(5, 1fr);
  }

  .mobile-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-decoration: none;
    color: var(--color-muted, #847062);
    transition: color 0.15s ease;
    user-select: none;
  }

  .mobile-tab:hover {
    text-decoration: none;
  }

  .tab-icon {
    width: 22px;
    height: 22px;
    stroke-width: 2;
  }

  .tab-label {
    font-family: var(--font-heading, 'Space Mono', monospace);
    font-size: 0.65rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .mobile-tab.active {
    color: var(--color-primary, #a66130);
  }

  .mobile-tab.active .tab-icon {
    stroke-width: 2.5;
  }

  .logout-tab {
    color: #ef4444;
  }
}
</style>
