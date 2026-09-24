<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEntertainmentStore, type EntertainmentTab } from '@/stores/entertainment'
import LetterboxdCard from '@/components/entertainment/LetterboxdCard.vue'
import GameCard from '@/components/entertainment/GameCard.vue'
import GameReviewModal from '@/components/entertainment/GameReviewModal.vue'
import PostCardSkeleton from '@/components/feed/PostCardSkeleton.vue'
import NewPostsBanner from '@/components/feed/NewPostsBanner.vue'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const entertainmentStore = useEntertainmentStore()

function handleFlushPending() {
  entertainmentStore.flushPendingPosts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const activeTab = computed({
  get: () => entertainmentStore.activeTab,
  set: (val: EntertainmentTab) => entertainmentStore.setActiveTab(val),
})

const sentinelRef = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.start_date || route.query.end_date || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterStartDate = computed(() => (route.query.start_date as string) || '')
const filterEndDate = computed(() => (route.query.end_date as string) || '')
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => (route.query.user_id ? Number(route.query.user_id) : null))

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

  // Se já temos posts carregados da rede nesta sessão, não é um reload forçado nem há filtros de busca ativos, reutiliza o estado do Pinia
  if (
    !force &&
    !hasSearchFilters.value &&
    entertainmentStore.hasLoaded &&
    entertainmentStore.posts.length > 0 &&
    !entertainmentStore.isFiltered
  ) {
    return
  }

  await entertainmentStore.fetchEntertainmentPosts(1, {
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    startDate: filterStartDate.value || undefined,
    endDate: filterEndDate.value || undefined,
    userId: filterUserId.value || undefined,
    forceRefresh: force,
  })
}

async function loadMore() {
  if (entertainmentStore.isLoadingMore || !entertainmentStore.hasMorePages) return
  await entertainmentStore.loadMorePosts()
}

function syncTabFromRoute() {
  const tabFromQuery = route.query.tab as EntertainmentTab
  if (tabFromQuery === 'games' || tabFromQuery === 'series' || tabFromQuery === 'movies') {
    if (entertainmentStore.activeTab !== tabFromQuery) {
      entertainmentStore.setActiveTab(tabFromQuery)
    }
  }
}

function clearSearch() {
  const query: Record<string, string> = {}
  if (route.query.tab) {
    query.tab = String(route.query.tab)
  }
  router.push({ path: '/entertainment', query: Object.keys(query).length ? query : undefined })
}

const showGameReviewModal = ref(false)

function handleGameCreated(newPost: any) {
  entertainmentStore.addPost(newPost)
  if (activeTab.value !== 'games') {
    handleTabChange('games')
  }
}

function handleTabChange(tab: EntertainmentTab) {
  entertainmentStore.setActiveTab(tab)
  router.replace({
    query: {
      ...route.query,
      tab: tab !== 'movies' ? tab : undefined,
    },
  })
}

function handlePostDeleted(deletedId: number) {
  entertainmentStore.removePostLocally(deletedId)
}

function checkSentinelIntersection() {
  if (
    !sentinelRef.value ||
    !entertainmentStore.hasMorePages ||
    entertainmentStore.isLoading ||
    entertainmentStore.isLoadingMore
  ) {
    return
  }
  const rect = sentinelRef.value.getBoundingClientRect()
  if (rect.top <= window.innerHeight + 300) {
    loadMore()
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
        entertainmentStore.hasMorePages &&
        !entertainmentStore.isLoading &&
        !entertainmentStore.isLoadingMore
      ) {
        loadMore()
      }
    },
    {
      rootMargin: '300px',
      threshold: 0.1,
    }
  )

  if (sentinelRef.value) {
    scrollObserver.observe(sentinelRef.value)
  }
}

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(async () => {
  await loadPostsForCurrentRoute(true)
})

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
    if (name !== 'entertainment') return
    if (tab !== oldTab) {
      syncTabFromRoute()
    }
    const filtersChanged =
      q !== oldQ ||
      search !== oldSearch ||
      startDate !== oldStartDate ||
      endDate !== oldEndDate ||
      date !== oldDate ||
      userId !== oldUserId

    if (filtersChanged) {
      loadPostsForCurrentRoute(true)
    } else if (tab !== oldTab) {
      loadPostsForCurrentRoute(false)
    }
  }
)

watch(
  () => entertainmentStore.isLoading,
  (loading) => {
    if (!loading && entertainmentStore.hasMorePages && sentinelRef.value) {
      nextTick(() => {
        checkSentinelIntersection()
      })
    }
  }
)

watch(sentinelRef, (newEl, oldEl) => {
  if (oldEl && scrollObserver) {
    scrollObserver.unobserve(oldEl)
  }
  if (newEl && scrollObserver) {
    scrollObserver.observe(newEl)
    nextTick(() => {
      checkSentinelIntersection()
    })
  }
})

onMounted(() => {
  setupScrollObserver()
  entertainmentStore.subscribeToEntertainment(authStore.user?.id)
  loadPostsForCurrentRoute()
})

onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
  }
  entertainmentStore.unsubscribeFromEntertainment()
})
</script>

<template>
  <div
    class="entertainment-page"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull to refresh indicator -->
    <PullToRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshingFromPull"
      refreshing-text="Buscando novidades de entretenimento..."
    />

    <!-- Real-time new posts banner -->
    <NewPostsBanner
      :count="entertainmentStore.pendingCount"
      :item-label="activeTab === 'games' ? 'avaliações de jogos' : 'avaliações de filmes'"
      @click="handleFlushPending"
    />

    <!-- Header Section (padrão com cor primária) -->
    <header class="entertainment-header">
      <h1 class="page-title">» Atividades e Análises</h1>
      <div class="entertainment-header-actions">
        <button
          v-if="activeTab === 'games'"
          type="button"
          class="btn-new-review"
          @click="showGameReviewModal = true"
        >
          [ + Review ]
        </button>
        <button
          type="button"
          class="refresh-btn"
          :class="{ 'is-refreshing': entertainmentStore.isLoading }"
          :disabled="entertainmentStore.isLoading"
          @click="loadPostsForCurrentRoute(true)"
          title="Recarregar publicações"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="refresh-icon"
            :class="{ 'spin': entertainmentStore.isLoading }"
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
    </header>

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

    <!-- Navigation Tabs (abaixo de forma separada, igual ao perfil) -->
    <div class="entertainment-tabs-bar">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'movies' }"
        @click="handleTabChange('movies')"
      >
        🎬 Filmes
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'series' }"
        @click="handleTabChange('series')"
      >
        📺 Séries
        <span class="tab-badge soon-badge">Em breve</span>
      </button>

      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'games' }"
        @click="handleTabChange('games')"
      >
        🎮 Jogos
      </button>
    </div>

    <!-- Main Content Stream -->
    <main class="entertainment-stream">
      <!-- Movies Tab (Letterboxd) -->
      <section v-if="activeTab === 'movies'" class="tab-content">
        <div v-if="entertainmentStore.isLoading && !entertainmentStore.posts.length" class="loading-skeletons">
          <PostCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <template v-else-if="entertainmentStore.posts.length">
          <LetterboxdCard
            v-for="post in entertainmentStore.posts"
            :key="post.id"
            :post="post"
            @deleted="handlePostDeleted"
          />

          <!-- Sentinel para Infinite Scroll -->
          <div ref="sentinelRef" class="sentinel-element"></div>

          <!-- Loading Mais Avaliações Indicator -->
          <div v-if="entertainmentStore.isLoadingMore" class="infinite-loading-bar">
            <span class="refresh-dot"></span>
            <span>Carregando mais filmes...</span>
          </div>

          <!-- Final do Feed de Mídias -->
          <div v-else-if="!entertainmentStore.hasMorePages && entertainmentStore.posts.length" class="infinite-end-card">
            <span class="end-marker">🎬</span>
            <span class="end-text">Você visualizou todas as avaliações de cinema!</span>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="retro-box empty-state">
          <span class="empty-icon">{{ hasSearchFilters ? '🔍' : '🍿' }}</span>
          <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhuma avaliação encontrada' : 'Nenhuma atividade de cinema ainda' }}</h3>
          <p class="empty-desc">
            {{ hasSearchFilters ? 'Tente ajustar os filtros ou pesquisar por outros termos.' : 'Vincule sua conta do Letterboxd no seu perfil (Configurações → Contas Conectadas) para que suas resenhas e filmes assistidos apareçam aqui automaticamente!' }}
          </p>
          <button v-if="hasSearchFilters" type="button" class="empty-action-link" @click="clearSearch">
            [ Limpar busca ]
          </button>
          <router-link v-else to="/profile" class="empty-action-link">
            [ Ir para o Perfil e Conectar ]
          </router-link>
        </div>
      </section>

      <!-- Series Tab (Placeholder) -->
      <section v-else-if="activeTab === 'series'" class="tab-content">
        <div class="retro-box upcoming-box">
          <span class="upcoming-icon">📺</span>
          <h3 class="upcoming-title">Em breve: Séries e Maratonas</h3>
          <p class="upcoming-desc">
            Estamos preparando integrações para você compartilhar suas séries favoritas, episódios assistidos e notas de temporadas.
          </p>
        </div>
      </section>

      <!-- Games Tab -->
      <section v-else-if="activeTab === 'games'" class="tab-content">
        <div v-if="entertainmentStore.isLoading && !entertainmentStore.posts.length" class="loading-skeletons">
          <PostCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <template v-else-if="entertainmentStore.posts.length">
          <GameCard
            v-for="post in entertainmentStore.posts"
            :key="post.id"
            :post="post"
            @deleted="handlePostDeleted"
          />

          <!-- Sentinel para Infinite Scroll -->
          <div ref="sentinelRef" class="sentinel-element"></div>

          <!-- Loading Mais Avaliações Indicator -->
          <div v-if="entertainmentStore.isLoadingMore" class="infinite-loading-bar">
            <span class="refresh-dot"></span>
            <span>Carregando mais jogos...</span>
          </div>

          <!-- Final do Feed de Jogos -->
          <div v-else-if="!entertainmentStore.hasMorePages && entertainmentStore.posts.length" class="infinite-end-card">
            <span class="end-marker">🎮</span>
            <span class="end-text">Você visualizou todas as atividades e análises de jogos!</span>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="retro-box empty-state">
          <span class="empty-icon">{{ hasSearchFilters ? '🔍' : '🎮' }}</span>
          <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhum jogo encontrado' : 'Nenhuma atividade de jogo ainda' }}</h3>
          <p class="empty-desc">
            {{ hasSearchFilters ? 'Tente ajustar os filtros ou pesquisar por outros termos.' : 'Vincule sua Gamertag do Xbox em Contas Conectadas ou publique uma análise com as suas próprias palavras agora mesmo!' }}
          </p>
          <div class="empty-actions-row">
            <button type="button" class="btn-create-game-empty" @click="showGameReviewModal = true">
              [ + Escrever Análise de Jogo ]
            </button>
            <router-link to="/profile" class="empty-action-link">
              [ Ir para o Perfil e Conectar Xbox ]
            </router-link>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal para Escrever Análise de Jogo -->
    <GameReviewModal
      v-model="showGameReviewModal"
      @created="handleGameCreated"
    />
  </div>
</template>

<style scoped>
.btn-new-review {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 0.25rem 0.65rem;
  border-radius: 3px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-new-review:hover {
  background: rgba(255, 255, 255, 0.35);
}

.empty-actions-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.btn-create-game-empty {
  background: var(--color-primary, #a66130);
  color: #fff;
  border: 1px solid var(--color-primary-800, #5f4120);
  padding: 0.4rem 0.85rem;
  border-radius: 3px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}

.btn-create-game-empty:hover {
  opacity: 0.9;
}
.entertainment-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.entertainment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.page-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.entertainment-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

@media (max-width: 480px) {
  .page-title {
    font-size: 0.9rem;
  }
  .btn-new-review {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }
  .refresh-btn {
    padding: 0.25rem 0.45rem;
  }
}

/* Search filter banner */
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

/* Tabs bar (separada abaixo, igual ao perfil) */
.entertainment-tabs-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
  border-radius: 2px;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.05);
}

.tab-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
}

.tab-btn.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary-800, #5f4120);
}

.tab-badge {
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  background-color: #14181c;
  color: #00e054;
  font-weight: 700;
}

.tab-badge.soon-badge {
  background-color: #edf2f7;
  color: #718096;
}

.tab-btn.active .tab-badge.soon-badge {
  background-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Stream & States */
.entertainment-stream {
  display: flex;
  flex-direction: column;
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
  margin-top: 1rem;
}

.refresh-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-primary, #a66130);
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

.empty-state,
.upcoming-box {
  background-color: #ffffff;
  border: 2px dashed var(--color-border, #D8CDC5);
  padding: 2.5rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-icon,
.upcoming-icon {
  font-size: 2.5rem;
}

.empty-title,
.upcoming-title {
  font-family: var(--font-heading, monospace);
  font-size: 1.15rem;
  color: var(--color-primary-900, #3d2a14);
  margin: 0;
}

.empty-desc,
.upcoming-desc {
  font-size: 0.875rem;
  color: #718096;
  max-width: 440px;
  line-height: 1.5;
  margin: 0;
}

.empty-action-link {
  margin-top: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.9rem;
  color: var(--color-primary, #a66130);
  font-weight: 700;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.empty-action-link:hover {
  text-decoration: underline;
}
</style>
