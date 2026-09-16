<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import PostCard from '@/components/feed/PostCard.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import NewPostsBanner from '@/components/feed/NewPostsBanner.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()
const authStore = useAuthStore()

const showCreateModal = ref(false)

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => route.query.user_id ? Number(route.query.user_id) : null)

async function loadPostsForCurrentRoute() {
  await feedStore.fetchPosts(1, {
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    userId: filterUserId.value || undefined,
  })
}

watch(
  () => route.query,
  () => {
    loadPostsForCurrentRoute()
  }
)

function clearSearch() {
  router.push({ path: '/feed' })
}

onMounted(async () => {
  await loadPostsForCurrentRoute()
  if (route.hash) {
    await nextTick()
    setTimeout(() => {
      const el = document.querySelector(route.hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  // Subscribe to real-time post updates
  const userId = authStore.user?.id
  if (userId) {
    feedStore.subscribeToFeed(userId)
  }
})

onUnmounted(() => {
  feedStore.unsubscribeFromFeed()
  // Clear pending posts when leaving the feed
  feedStore.pendingPosts.splice(0)
  feedStore.clearFilters()
})
</script>

<template>
  <div class="feed-view-container">
    <!-- Real-time new posts banner -->
    <NewPostsBanner />

    <!-- Quick Create Post Box -->
    <div class="quick-post-card" @click="showCreateModal = true">
      <div class="quick-post-row">
        <UserAvatar v-if="authStore.user" :user="authStore.user" size="sm" />
        <div class="fake-input">
          No que você está pensando, Capivara?
        </div>
      </div>
      <div class="quick-actions-row">
        <div class="quick-actions-left">
          <button type="button" class="quick-action-btn" @click.stop="showCreateModal = true">
            <span class="action-icon">📷</span>
            <span class="action-text-full">Anexar foto</span>
            <span class="action-text-short">Foto</span>
          </button>
          <button type="button" class="quick-action-btn" @click.stop="showCreateModal = true">
            <span class="action-icon">😊</span>
            <span>Sentimento</span>
          </button>
        </div>
        <button type="button" class="quick-publish-btn" @click.stop="showCreateModal = true">
          [ Criar post ]
        </button>
      </div>
    </div>

    <!-- Feed Header Title -->
    <div class="feed-header-line">
      <h2 class="feed-title">» {{ hasSearchFilters ? 'Resultados da pesquisa' : 'Publicações recentes' }}</h2>
      <button
        type="button"
        class="refresh-btn"
        :class="{ 'is-refreshing': feedStore.isLoading }"
        :disabled="feedStore.isLoading"
        @click="loadPostsForCurrentRoute"
        title="Recarregar publicações"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="refresh-icon"
          :class="{ 'spin': feedStore.isLoading }"
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
        <span class="search-filter-title">🔍 Filtro de busca:</span>
        <span v-if="searchTerms" class="search-tag">Texto: "{{ searchTerms }}"</span>
        <span v-if="filterDate" class="search-tag">Data: {{ filterDate }}</span>
        <span v-if="filterUserId" class="search-tag">Usuário ID: {{ filterUserId }}</span>
      </div>
      <button type="button" class="clear-search-link" @click="clearSearch">
        [✕ Limpar busca]
      </button>
    </div>

    <!-- Background refreshing indicator if posts already exist -->
    <div v-if="feedStore.isLoading && feedStore.posts.length > 0" class="refresh-indicator-bar">
      <span class="refresh-dot"></span>
      <span>Recarregando publicações...</span>
    </div>

    <!-- Loading State -->
    <div v-if="feedStore.isLoading && feedStore.posts.length === 0" class="loading-state">
      Carregando publicações...
    </div>

    <!-- Posts List -->
    <div v-else-if="feedStore.posts.length" class="posts-stream">
      <PostCard
        v-for="post in feedStore.posts"
        :key="post.id"
        :post="post"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-feed-card">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhuma publicação encontrada' : 'Nenhuma publicação ainda' }}</h3>
      <p class="empty-subtitle">
        {{ hasSearchFilters ? 'Tente ajustar os filtros ou pesquisar por outros termos.' : 'Seja o primeiro a compartilhar algo com os amigos da casa!' }}
      </p>
      <button v-if="hasSearchFilters" type="button" class="empty-create-btn" @click="clearSearch">
        [ Limpar busca ]
      </button>
      <button v-else type="button" class="empty-create-btn" @click="showCreateModal = true">
        [ Criar primeira publicação ]
      </button>
    </div>

    <!-- Modal to Create Post -->
    <PostCreateModal
      v-model="showCreateModal"
      @created="feedStore.fetchPosts(1)"
    />
  </div>
</template>

<style scoped>
.feed-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quick-post-card {
  background-color: #ffffff;
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.15s ease;
}
.quick-post-card:hover {
  border-color: var(--color-primary-400, #c4884e);
}

.quick-post-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fake-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-family: var(--font-body);
  color: var(--color-muted);
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.quick-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid var(--color-primary-100);
  padding-top: 0.5rem;
}

.quick-actions-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.quick-action-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-primary-800);
  font-family: var(--font-heading);
  cursor: pointer;
  white-space: nowrap;
  padding: 0.25rem 0.4rem;
  transition: all 0.15s ease;
}
.quick-action-btn:hover {
  background-color: var(--color-primary-50, #f8f6f1);
  border-color: var(--color-border);
}

.action-icon {
  font-size: 0.95rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.action-text-short {
  display: none;
}
.action-text-full {
  display: inline;
}

@media (max-width: 480px) {
  .action-text-full {
    display: none;
  }
  .action-text-short {
    display: inline;
  }
}

.quick-publish-btn {
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.35rem 0.65rem;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}
.quick-publish-btn:hover {
  background-color: var(--color-primary-600);
}

.feed-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-top: 0.25rem;
}

.feed-title {
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

.refresh-indicator-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-primary-100, #f8f6f1);
  border: 1px solid var(--color-primary-300, #c4884e);
  border-radius: 2px;
  padding: 0.4rem 0.75rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--color-primary-800);
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary);
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from {
    opacity: 0.4;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1.15);
  }
}

.loading-state {
  text-align: center;
  padding: 2rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.empty-feed-card {
  background: #ffffff;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  padding: 2.5rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 3rem;
}

.empty-title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-primary-800);
}

.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted);
  max-width: 320px;
}

.empty-create-btn {
  margin-top: 0.75rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
}
.empty-create-btn:hover {
  background-color: var(--color-primary-600);
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
</style>
