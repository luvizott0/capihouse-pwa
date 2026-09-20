<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Post } from '@/types/models'
import { getPosts } from '@/api/posts'
import LetterboxdCard from '@/components/entertainment/LetterboxdCard.vue'
import PostCardSkeleton from '@/components/feed/PostCardSkeleton.vue'
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

type EntertainmentTab = 'movies' | 'series' | 'games'

const activeTab = ref<EntertainmentTab>('movies')
const posts = ref<Post[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const currentPage = ref(1)
const lastPage = ref(1)
const hasMore = ref(false)

async function fetchEntertainmentPosts(page = 1, isRefresh = false) {
  if (page === 1 && !isRefresh) {
    isLoading.value = true
  }

  try {
    const response = await getPosts({
      page,
      category: 'entertainment',
      entertainmentType: activeTab.value === 'movies' ? 'movie' : undefined,
    })

    const data = response.data
    if (page === 1) {
      posts.value = data.data || []
    } else {
      posts.value = [...posts.value, ...(data.data || [])]
    }

    currentPage.value = data.current_page || 1
    lastPage.value = data.last_page || 1
    hasMore.value = currentPage.value < lastPage.value
  } catch (error) {
    console.error('Erro ao buscar posts de entretenimento:', error)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value) return
  isLoadingMore.value = true
  await fetchEntertainmentPosts(currentPage.value + 1)
}

function handleTabChange(tab: EntertainmentTab) {
  activeTab.value = tab
  if (tab === 'movies') {
    currentPage.value = 1
    fetchEntertainmentPosts(1)
  }
}

function handlePostDeleted(deletedId: number) {
  posts.value = posts.value.filter((p) => p.id !== deletedId)
}

const {
  pullDistance,
  isRefreshingFromPull,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
} = usePullToRefresh(async () => {
  if (activeTab.value === 'movies') {
    await fetchEntertainmentPosts(1, true)
  }
})

onMounted(() => {
  fetchEntertainmentPosts(1)
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

    <!-- Header Section (padrão com cor primária) -->
    <header class="entertainment-header">
      <h1 class="page-title">» Mídias</h1>
    </header>

    <!-- Navigation Tabs (abaixo de forma separada, igual ao perfil) -->
    <div class="entertainment-tabs-bar">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === 'movies' }"
        @click="handleTabChange('movies')"
      >
        🎬 Filmes
        <span class="tab-badge">Letterboxd</span>
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
        <span class="tab-badge soon-badge">Em breve</span>
      </button>
    </div>

    <!-- Main Content Stream -->
    <main class="entertainment-stream">
      <!-- Movies Tab (Letterboxd) -->
      <section v-if="activeTab === 'movies'" class="tab-content">
        <div v-if="isLoading" class="loading-skeletons">
          <PostCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <template v-else-if="posts.length">
          <LetterboxdCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
            @deleted="handlePostDeleted"
          />

          <div v-if="hasMore" class="load-more-box">
            <button
              type="button"
              class="retro-load-more-btn"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              {{ isLoadingMore ? 'Carregando mais filmes...' : '[ Carregar mais avaliações ]' }}
            </button>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="retro-box empty-state">
          <span class="empty-icon">🍿</span>
          <h3 class="empty-title">Nenhuma atividade de cinema ainda</h3>
          <p class="empty-desc">
            Vincule sua conta do Letterboxd no seu perfil (Configurações → Contas Conectadas) para que suas resenhas e filmes assistidos apareçam aqui automaticamente!
          </p>
          <router-link to="/profile" class="empty-action-link">
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

      <!-- Games Tab (Placeholder) -->
      <section v-else-if="activeTab === 'games'" class="tab-content">
        <div class="retro-box upcoming-box">
          <span class="upcoming-icon">🎮</span>
          <h3 class="upcoming-title">Em breve: Jogos e Conquistas</h3>
          <p class="upcoming-desc">
            Em breve você poderá conectar plataformas de jogos e compartilhar o que está jogando e platinando com a casa!
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
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

.load-more-box {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0 2rem;
}

.retro-load-more-btn {
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px solid var(--color-border, #D8CDC5);
  color: var(--color-primary-800, #5f4120);
  padding: 0.6rem 1.25rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.05);
}

.retro-load-more-btn:hover:not(:disabled) {
  background-color: var(--color-primary-100, #fdf8f3);
  border-color: var(--color-primary, #a66130);
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
}
.empty-action-link:hover {
  text-decoration: underline;
}
</style>
