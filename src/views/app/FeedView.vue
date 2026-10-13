<script setup lang="ts">
defineOptions({
  name: 'FeedView'
})

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFeedStore } from '@/stores/feed'
import { useAuthStore } from '@/stores/auth'
import PostCard from '@/components/feed/PostCard.vue'
import PostCardSkeleton from '@/components/feed/PostCardSkeleton.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import NewPostsBanner from '@/components/feed/NewPostsBanner.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()
const authStore = useAuthStore()

import type { FeedTab } from '@/stores/feed'
import GameReviewModal from '@/components/entertainment/GameReviewModal.vue'
import { openExternalUrl } from '@/utils/externalLinks'

const showCreateModal = ref(false)
const showGameReviewModal = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null

function openCapyShowTimeApp() {
  openExternalUrl('https://bmo.tailf56388.ts.net:8443')
}

const activeTab = computed<FeedTab>({
  get: () => feedStore.activeTab,
  set: (val: FeedTab) => feedStore.setActiveTab(val),
})

function syncTabFromRoute() {
  const tabFromQuery = route.query.tab as FeedTab
  if (tabFromQuery && ['all', 'text', 'media', 'movies', 'series', 'games'].includes(tabFromQuery)) {
    if (feedStore.activeTab !== tabFromQuery) {
      feedStore.setActiveTab(tabFromQuery)
    }
  } else if (!tabFromQuery && feedStore.activeTab !== 'all') {
    feedStore.setActiveTab('all')
  }
}

function handleTabChange(tab: FeedTab) {
  feedStore.setActiveTab(tab)
  router.replace({
    query: {
      ...route.query,
      tab: tab !== 'all' ? tab : undefined,
    },
  })
}

function handleGameCreated(newPost: any) {
  if (feedStore.posts && Array.isArray(feedStore.posts)) {
    feedStore.posts.unshift(newPost)
  }
}

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(() => loadPostsForCurrentRoute(true))

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.start_date || route.query.end_date || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterStartDate = computed(() => (route.query.start_date as string) || '')
const filterEndDate = computed(() => (route.query.end_date as string) || '')
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => route.query.user_id ? Number(route.query.user_id) : null)

const dateFilterLabel = computed(() => {
  if (filterStartDate.value && filterEndDate.value) {
    return `Período: ${filterStartDate.value} até ${filterEndDate.value}`
  }
  if (filterStartDate.value) {
    return `A partir de: ${filterStartDate.value}`
  }
  if (filterEndDate.value) {
    return `Até: ${filterEndDate.value}`
  }
  if (filterDate.value) {
    return `Data: ${filterDate.value}`
  }
  return ''
})

async function loadPostsForCurrentRoute(force = false) {
  syncTabFromRoute()

  // Se já temos posts carregados da rede nesta sessão, não é um reload forçado nem há filtros ativos, reutiliza o estado do Pinia
  if (!force && !hasSearchFilters.value && activeTab.value === 'all' && feedStore.hasLoaded && !feedStore.isFiltered && feedStore.posts.length > 0) {
    return
  }

  await feedStore.fetchPosts(1, {
    tab: activeTab.value,
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
    userId: filterUserId.value || undefined,
  })
}

function checkSentinelIntersection() {
  if (!sentinelRef.value || !feedStore.hasMorePages || feedStore.isLoading || feedStore.isLoadingMore) {
    return
  }
  const rect = sentinelRef.value.getBoundingClientRect()
  if (rect.top <= window.innerHeight + 300) {
    feedStore.loadMorePosts()
  }
}

function setupScrollObserver() {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }

  scrollObserver = new IntersectionObserver(
    (entries) => {
      const first = entries[0]
      if (
        first?.isIntersecting &&
        feedStore.hasMorePages &&
        !feedStore.isLoading &&
        !feedStore.isLoadingMore
      ) {
        feedStore.loadMorePosts()
      }
    },
    {
      rootMargin: '300px', // Inicia a busca antes do usuário atingir a linha final
      threshold: 0.1,
    }
  )

  if (sentinelRef.value) {
    scrollObserver.observe(sentinelRef.value)
  }
}

watch(
  () => [
    route.name,
    route.query.q,
    route.query.search,
    route.query.start_date,
    route.query.end_date,
    route.query.date,
    route.query.user_id,
    route.query.tab,
  ],
  ([name, q, search, startDate, endDate, date, userId, tab], [, oldQ, oldSearch, oldStartDate, oldEndDate, oldDate, oldUserId, oldTab]) => {
    if (name !== 'feed') return
    if (tab !== oldTab) {
      syncTabFromRoute()
      loadPostsForCurrentRoute(true)
      return
    }
    if (q !== oldQ || search !== oldSearch || startDate !== oldStartDate || endDate !== oldEndDate || date !== oldDate || userId !== oldUserId) {
      loadPostsForCurrentRoute(true)
    }
  }
)

function clearSearch() {
  const query: Record<string, string> = {}
  if (route.query.tab) {
    query.tab = String(route.query.tab)
  }
  router.push({ path: '/feed', query: Object.keys(query).length ? query : undefined })
}

onMounted(async () => {
  setupScrollObserver()

  // Subscribe to real-time post updates
  const userId = authStore.user?.id
  if (userId) {
    feedStore.subscribeToFeed(userId)
  }

  await loadPostsForCurrentRoute()
  await nextTick()

  if (route.hash) {
    setTimeout(() => {
      const el = document.querySelector(route.hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }
})

// Se a sincronização inicial terminar e o usuário já estiver próximo ao fim, carrega mais páginas
watch(
  () => feedStore.isLoading,
  (loading) => {
    if (!loading && feedStore.hasMorePages && sentinelRef.value) {
      nextTick(() => {
        checkSentinelIntersection()
      })
    }
  }
)

// Observa o sentinel se o DOM do feed for atualizado
watch(sentinelRef, (newEl) => {
  if (newEl && scrollObserver) {
    scrollObserver.observe(newEl)
  }
})

onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
  }
  feedStore.unsubscribeFromFeed()
  feedStore.pendingPosts.splice(0)
  feedStore.clearFilters()
})
</script>

<template>
  <div
    class="feed-view-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator box -->
    <PullToRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshingFromPull"
      refreshing-text="Atualizando feed..."
    />

    <!-- Real-time new posts banner -->
    <NewPostsBanner />

    <!-- Filter Tabs (no topo do feed) -->
    <div class="feed-tabs-bar">
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'all' }"
        @click="handleTabChange('all')"
      >
        🌐 Todas
      </button>
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'text' }"
        @click="handleTabChange('text')"
      >
        ✍️ Capits
      </button>
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'media' }"
        @click="handleTabChange('media')"
      >
        📷 Mídias
      </button>
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'movies' }"
        @click="handleTabChange('movies')"
      >
        🎬 Filmes
      </button>
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'series' }"
        @click="handleTabChange('series')"
      >
        📺 Séries
      </button>
      <button
        type="button"
        class="feed-tab-btn"
        :class="{ active: activeTab === 'games' }"
        @click="handleTabChange('games')"
      >
        🎮 Jogos
      </button>
    </div>

    <!-- Quick Create Post Box (quando no feed geral, capits ou mídias) -->
    <div v-if="activeTab === 'all' || activeTab === 'text' || activeTab === 'media'" class="quick-post-card" @click="showCreateModal = true">
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

    <!-- Atalho quando na aba de Jogos -->
    <div v-else-if="activeTab === 'games'" class="capyshowtime-banner games-shortcut-banner">
      <div class="capy-banner-info">
        <span class="capy-badge">🎮 Análises de Jogos</span>
        <p class="capy-sub">O que os amigos da Capihouse estão jogando</p>
      </div>
      <button
        type="button"
        class="open-game-review-btn"
        @click="showGameReviewModal = true"
      >
        + Review
      </button>
    </div>

    <!-- Atalho quando na aba de Séries (Banner estilo CapyShowTime com botão amarelo) -->
    <div v-else-if="activeTab === 'series'" class="capyshowtime-banner">
      <div class="capy-banner-info">
        <span class="capy-badge">📺 CapyShowTime</span>
        <p class="capy-sub">O que os amigos da Capihouse estão assistindo</p>
      </div>
      <button
        type="button"
        class="open-capy-btn"
        @click="openCapyShowTimeApp"
      >
        Abrir App ↗
      </button>
    </div>

    <!-- Feed Header Title -->
    <div class="feed-header-line">
      <h2 class="feed-title">» {{ hasSearchFilters ? 'Resultados da pesquisa' : 'Publicações recentes' }}</h2>
      <button
        type="button"
        class="refresh-btn"
        :class="{ 'is-refreshing': feedStore.isLoading }"
        :disabled="feedStore.isLoading"
        @click="loadPostsForCurrentRoute(true)"
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
        <span v-if="dateFilterLabel" class="search-tag">{{ dateFilterLabel }}</span>
        <span v-if="filterUserId" class="search-tag">Usuário ID: {{ filterUserId }}</span>
      </div>
      <button type="button" class="clear-search-link" @click="clearSearch">
        [✕ Limpar busca]
      </button>
    </div>


    <!-- Loading State com Skeletons Shimmer -->
    <div v-if="feedStore.isLoading && feedStore.posts.length === 0" class="posts-stream">
      <PostCardSkeleton v-for="i in 3" :key="i" />
    </div>

    <!-- Posts List with Infinite Scroll -->
    <template v-else-if="feedStore.posts.length">
      <div class="posts-stream">
        <PostCard
          v-for="post in feedStore.posts"
          :key="post.id"
          :post="post"
        />
      </div>

      <!-- Sentinel para Infinite Scroll -->
      <div ref="sentinelRef" class="sentinel-element"></div>

      <!-- Loading Mais Posts Indicator -->
      <div v-if="feedStore.isLoadingMore" class="infinite-loading-bar">
        <span class="refresh-dot"></span>
        <span>Carregando mais publicações antigas...</span>
      </div>

      <!-- Sincronizando com o servidor em background se já tiver posts na tela -->
      <div v-else-if="feedStore.isLoading && feedStore.posts.length > 0" class="infinite-loading-bar">
        <span class="refresh-dot"></span>
        <span>Sincronizando publicações...</span>
      </div>

      <!-- Final do Feed -->
      <div v-else-if="!feedStore.hasMorePages && feedStore.hasLoaded" class="infinite-end-card">
        <span class="end-marker">🐾</span>
        <span class="end-text">Você visualizou todas as publicações recentes da casa!</span>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="empty-feed-card">
      <img src="/capihouse-logo.png" alt="Capivara" class="empty-capivara-logo" />
      <h3 class="empty-title">
        <template v-if="hasSearchFilters">Nenhuma publicação encontrada</template>
        <template v-else-if="activeTab === 'text'">Nenhum Capit publicado ainda</template>
        <template v-else-if="activeTab === 'movies'">Nenhum filme compartilhado ainda</template>
        <template v-else-if="activeTab === 'series'">Nenhuma série compartilhada ainda</template>
        <template v-else-if="activeTab === 'games'">Nenhum jogo compartilhado ainda</template>
        <template v-else-if="activeTab === 'media'">Nenhuma mídia encontrada</template>
        <template v-else>Nenhuma publicação ainda</template>
      </h3>
      <p class="empty-subtitle">
        <template v-if="hasSearchFilters">
          Tente ajustar os filtros ou pesquisar por outros termos.
        </template>
        <template v-else-if="activeTab === 'text'">
          Seja o primeiro a publicar um Capit para os amigos da casa!
        </template>
        <template v-else-if="activeTab === 'movies'">
          Conecte sua conta do Letterboxd no perfil para sincronizar seus filmes ou compartilhe o que assistiu!
        </template>
        <template v-else-if="activeTab === 'series'">
          Avalie episódios, comente ou conclua séries no CapyShowTime para compartilhar com a casa!
        </template>
        <template v-else-if="activeTab === 'games'">
          Conecte sua conta Xbox ou cadastre uma análise do seu jogo favorito para movimentar a casa!
        </template>
        <template v-else-if="activeTab === 'media'">
          Seja o primeiro a compartilhar uma foto ou vídeo com os moradores!
        </template>
        <template v-else>
          Seja o primeiro a compartilhar algo com os amigos da casa!
        </template>
      </p>

      <div class="empty-actions">
        <button v-if="hasSearchFilters" type="button" class="empty-create-btn" @click="clearSearch">
          [ Limpar busca ]
        </button>
        <template v-else>
          <button
            v-if="activeTab === 'games'"
            type="button"
            class="empty-create-btn"
            @click="showGameReviewModal = true"
          >
            [ Cadastrar Análise de Jogo ]
          </button>
          <button
            v-else-if="activeTab === 'series'"
            type="button"
            class="empty-create-btn"
            @click="openCapyShowTimeApp"
          >
            [ Assistir no CapyShowTime ]
          </button>
          <router-link
            v-else-if="activeTab === 'movies'"
            to="/profile"
            class="empty-create-btn"
          >
            [ Configurar Letterboxd no Perfil ]
          </router-link>
          <button
            v-else
            type="button"
            class="empty-create-btn"
            @click="showCreateModal = true"
          >
            [ Criar primeira publicação ]
          </button>
        </template>
      </div>
    </div>

    <!-- Modal to Create Post -->
    <PostCreateModal
      v-model="showCreateModal"
      @created="feedStore.fetchPosts(1)"
    />

    <!-- Modal to Create Game Review -->
    <GameReviewModal
      v-model="showGameReviewModal"
      @created="handleGameCreated"
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

/* Sentinel & Infinite Scroll Indicators */
.sentinel-element {
  height: 20px;
  width: 100%;
  pointer-events: none;
  visibility: hidden;
}

.infinite-loading-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.85rem 1.25rem;
  background-color: #fdf8f3;
  border: 1px dashed #d4a574;
  border-radius: 4px;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  color: #5f4120;
  box-shadow: 0 1px 3px rgba(62, 39, 35, 0.06);
}

.infinite-end-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  text-align: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #5f4120;
  background-color: #fdf8f3;
  border: 1px solid #e8c9a5;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(62, 39, 35, 0.08);
  margin-top: 0.75rem;
  margin-bottom: 1rem;
}

.end-marker {
  font-size: 1rem;
}

/* Feed Tabs Bar */
.feed-tabs-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
  padding: 0.35rem 0.25rem 0.5rem 0.25rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.feed-tabs-bar::-webkit-scrollbar {
  display: none;
}

.feed-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  background-color: #ffffff;
  border: 1.5px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: #795548;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-shadow: 1px 1px 0 var(--color-border, #D8CDC5);
}

.feed-tab-btn:hover {
  background-color: #fcf9f5;
  border-color: #bcaaa4;
  color: #4e342e;
  transform: translateY(-1px);
}

.feed-tab-btn.active {
  background-color: #4a2e18;
  border-color: #4a2e18;
  color: #ffffff;
  box-shadow: 2px 2px 0 rgba(74, 46, 24, 0.35);
}

.feed-tab-icon {
  font-size: 0.95rem;
  line-height: 1;
}

/* CapyShowTime & Games Banners */
.capyshowtime-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-surface, #ffffff);
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: var(--radius-sm, 4px);
  padding: 10px 14px;
  box-shadow: 2px 2px 0 var(--color-border, #D8CDC5);
  margin-top: -0.25rem;
}

.capy-banner-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.capy-badge {
  font-family: var(--font-heading, monospace);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--color-primary-900, #3d2a14);
}

.capy-sub {
  font-size: 0.78rem;
  color: var(--color-text-muted, #718096);
  margin: 0;
}

.open-capy-btn {
  background-color: #f5c518;
  color: #12100e;
  font-weight: 700;
  font-size: 0.82rem;
  font-family: var(--font-heading, monospace);
  padding: 8px 14px;
  border-radius: 4px;
  border: 1px solid #d4a70a;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.open-capy-btn:hover {
  background-color: #e0b312;
  transform: translateY(-1px);
}

.open-game-review-btn {
  background-color: #f5c518;
  color: #12100e;
  font-weight: 700;
  font-size: 0.82rem;
  font-family: var(--font-heading, monospace);
  padding: 8px 14px;
  border-radius: 4px;
  border: 1px solid #d4a70a;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.open-game-review-btn:hover {
  background-color: #e0b312;
  transform: translateY(-1px);
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
