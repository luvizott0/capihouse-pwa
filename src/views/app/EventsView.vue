<script setup lang="ts">
defineOptions({
  name: 'EventsView'
})

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import EventCard from '@/components/events/EventCard.vue'
import EventCardSkeleton from '@/components/events/EventCardSkeleton.vue'
import EventCreateModal from '@/components/events/EventCreateModal.vue'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const showCreateModal = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null

const hasSearchFilters = computed(() => {
  return !!(route.query.q || route.query.search || route.query.date || route.query.user_id)
})

const searchTerms = computed(() => {
  return (route.query.q as string) || (route.query.search as string) || ''
})
const filterDate = computed(() => (route.query.date as string) || '')
const filterUserId = computed(() => route.query.user_id ? Number(route.query.user_id) : null)

async function loadEventsForCurrentRoute(force = false) {
  if (!force && !hasSearchFilters.value && (eventsStore.hasLoaded || eventsStore.events.length > 0)) {
    return
  }

  await eventsStore.fetchEvents(1, {
    search: searchTerms.value || undefined,
    date: filterDate.value || undefined,
    userId: filterUserId.value || undefined,
  })
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
        eventsStore.hasMorePages &&
        !eventsStore.isLoading &&
        !eventsStore.isLoadingMore
      ) {
        eventsStore.loadMoreEvents()
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

watch(
  () => route.query,
  () => {
    loadEventsForCurrentRoute(true)
  }
)

function clearSearch() {
  router.push({ path: '/events' })
}

onMounted(async () => {
  await loadEventsForCurrentRoute()
  await nextTick()
  setupScrollObserver()
})

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
  eventsStore.clearFilters()
})
</script>

<template>
  <div class="events-view-container">
    <!-- Header -->
    <div class="events-header">
      <div>
        <h2 class="section-title">» {{ hasSearchFilters ? 'Eventos Encontrados' : 'Eventos da Casa' }}</h2>
        <p class="section-subtitle">
          {{ hasSearchFilters ? 'Resultados filtrados da sua busca de eventos.' : '' }}
        </p>
      </div>
    </div>

    <!-- Search Results Banner -->
    <div v-if="hasSearchFilters" class="search-filter-banner">
      <div class="search-filter-info">
        <span class="search-filter-title">🔍 Filtro de eventos:</span>
        <span v-if="searchTerms" class="search-tag">Texto: "{{ searchTerms }}"</span>
        <span v-if="filterDate" class="search-tag">Data: {{ filterDate }}</span>
        <span v-if="filterUserId" class="search-tag">Criador ID: {{ filterUserId }}</span>
      </div>
      <button type="button" class="clear-search-link" @click="clearSearch">
        [✕ Limpar busca]
      </button>
    </div>

    <!-- Loading State com Skeletons Shimmer -->
    <div v-if="eventsStore.isLoading && eventsStore.events.length === 0" class="events-grid">
      <EventCardSkeleton v-for="i in 4" :key="i" />
    </div>

    <!-- Events Grid with Infinite Scroll -->
    <template v-else-if="eventsStore.events.length">
      <div class="events-grid">
        <EventCard
          v-for="event in eventsStore.events"
          :key="event.id"
          :event="event"
        />
      </div>

      <!-- Sentinel para Infinite Scroll -->
      <div ref="sentinelRef" class="sentinel-element"></div>

      <!-- Loading Mais Eventos Indicator -->
      <div v-if="eventsStore.isLoadingMore" class="infinite-loading-bar">
        <span class="refresh-dot"></span>
        <span>Carregando mais eventos...</span>
      </div>

      <!-- Final dos Eventos -->
      <div v-else-if="!eventsStore.hasMorePages" class="infinite-end-card">
        <span class="end-marker">📅</span>
        <span class="end-text">Todos os eventos da casa foram carregados!</span>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="empty-events-card">
      <div class="empty-icon">📅</div>
      <h3 class="empty-title">{{ hasSearchFilters ? 'Nenhum evento encontrado' : 'Nenhum evento agendado' }}</h3>
      <p class="empty-subtitle">
        {{ hasSearchFilters ? 'Tente buscar com outra data ou outros termos.' : 'Que tal marcar um café ou um rolê com a galera?' }}
      </p>
      <button v-if="hasSearchFilters" type="button" class="empty-create-btn" @click="clearSearch">
        [ Limpar busca ]
      </button>
      <button v-else type="button" class="empty-create-btn" @click="showCreateModal = true">
        [ Criar primeiro evento ]
      </button>
    </div>

    <!-- Create Event Modal -->
    <EventCreateModal
      v-model="showCreateModal"
      @created="loadEventsForCurrentRoute"
    />
  </div>
</template>

<style scoped>
.events-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-primary, #a66130);
  border: 1px solid var(--color-primary-800, #5f4120);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.section-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0.2rem 0 0 0;
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

.loading-state {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 2rem;
  text-align: center;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.empty-events-card {
  background-color: #ffffff;
  border: 1px dashed var(--color-border);
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
  padding: 1rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px dashed var(--color-primary-300, #c4884e);
  border-radius: 2px;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  margin-top: 0.75rem;
}

.infinite-end-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  text-align: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
  border-top: 1px dashed var(--color-border, #D8CDC5);
  margin-top: 0.75rem;
}

.end-marker {
  font-size: 1rem;
}
</style>
