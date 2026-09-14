<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
</script>

<template>
  <div>
    <!-- Desktop Top Navigation Menu -->
    <nav class="desktop-nav">
      <div class="nav-container">
        <div class="nav-tabs">
          <router-link to="/feed" class="nav-tab" active-class="active">
            Feed
          </router-link>
          <router-link to="/profile" class="nav-tab" active-class="active">
            Perfil
          </router-link>
          <router-link to="/events" class="nav-tab" active-class="active">
            Eventos
          </router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/users" class="nav-tab" active-class="active">
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
        <router-link to="/feed" class="mobile-tab" active-class="active">
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span class="tab-label">Feed</span>
        </router-link>

        <!-- Profile Tab -->
        <router-link to="/profile" class="mobile-tab" active-class="active">
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="tab-label">Perfil</span>
        </router-link>

        <!-- Events Tab -->
        <router-link to="/events" class="mobile-tab" active-class="active">
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="tab-label">Eventos</span>
        </router-link>

        <!-- Admin Tab (Only if admin) -->
        <router-link v-if="authStore.isAdmin" to="/admin/users" class="mobile-tab" active-class="active">
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="tab-label">Admin</span>
        </router-link>

        <!-- Logout Tab -->
        <a href="#" @click.prevent="authStore.logout" class="mobile-tab logout-tab">
          <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="tab-label">Sair</span>
        </a>
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
