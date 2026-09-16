<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchFilterModal, { type SearchScope, type SearchFilterState } from './SearchFilterModal.vue'

const emit = defineEmits<{ (e: 'open-create-post'): void; (e: 'open-create-event'): void }>()

const route = useRoute()
const router = useRouter()

const showFilterModal = ref(false)

// Search fields
const searchQuery = ref('')
const selectedScope = ref<SearchScope>('posts')
const selectedDate = ref('')
const selectedUserId = ref<number | null>(null)

// Deduce default scope from current route
function getScopeFromRoutePath(path: string): SearchScope {
  if (path.startsWith('/events')) return 'events'
  if (path.startsWith('/groups')) return 'groups'
  return 'posts'
}

// Sync fields from route query and path
function syncFromRoute() {
  searchQuery.value = typeof route.query.q === 'string' ? route.query.q : (typeof route.query.search === 'string' ? route.query.search : '')
  selectedDate.value = typeof route.query.date === 'string' ? route.query.date : ''
  selectedUserId.value = route.query.user_id ? Number(route.query.user_id) : null
  selectedScope.value = getScopeFromRoutePath(route.path)
}

// Initial sync
syncFromRoute()

// Watch route changes to keep search bar in sync
watch(
  () => [route.path, route.query],
  () => {
    syncFromRoute()
  }
)

// Active filter count (excluding query text, counting date and user)
const activeFilterCount = computed(() => {
  let count = 0
  if (selectedDate.value) count++
  if (selectedUserId.value !== null) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

function executeSearch() {
  const targetPath = selectedScope.value === 'events'
    ? '/events'
    : selectedScope.value === 'groups'
    ? '/groups'
    : '/feed'

  const query: Record<string, string> = {}
  const trimmed = searchQuery.value.trim()
  if (trimmed) query.q = trimmed
  if (selectedDate.value) query.date = selectedDate.value
  if (selectedUserId.value !== null) query.user_id = String(selectedUserId.value)

  router.push({
    path: targetPath,
    query: Object.keys(query).length ? query : undefined,
  })
}

function clearSearch() {
  searchQuery.value = ''
  executeSearch()
}

function handleApplyFilters(filters: SearchFilterState) {
  selectedScope.value = filters.scope
  selectedDate.value = filters.date
  selectedUserId.value = filters.userId
  executeSearch()
}

function handleClearFilters() {
  selectedDate.value = ''
  selectedUserId.value = null
  executeSearch()
}

const currentAction = computed(() => {
  const currentScope = getScopeFromRoutePath(route.path)
  if (currentScope === 'posts' && route.path.startsWith('/feed')) {
    return { label: '[ + Criar post ]', action: () => emit('open-create-post') }
  }
  if (currentScope === 'events') {
    return { label: '[ + Novo Evento ]', action: () => emit('open-create-event') }
  }
  return null
})
</script>

<template>
  <div class="search-bar-wrapper">
    <div class="search-inner">
      <!-- Filter Button (replaces redundant dropdown) -->
      <button
        type="button"
        class="filter-toggle-btn"
        :class="{ 'has-active': hasActiveFilters }"
        @click="showFilterModal = true"
        title="Filtros de busca (posts, eventos, grupos, data, usuário)"
        aria-label="Abrir filtros de pesquisa"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="filter-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span class="filter-btn-text">Filtros</span>
        <span v-if="hasActiveFilters" class="filter-badge">{{ activeFilterCount }}</span>
      </button>

      <!-- Search Input Container with Form -->
      <form class="search-input-container" @submit.prevent="executeSearch">
        <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>

        <input
          v-model="searchQuery"
          type="text"
          :placeholder="selectedScope === 'events' ? 'Buscar eventos...' : selectedScope === 'groups' ? 'Buscar grupos...' : 'Buscar no CapiHouse...'"
          class="retro-search-input"
          aria-label="Campo de busca"
        />

        <button
          v-if="searchQuery"
          type="button"
          class="clear-input-btn"
          @click="clearSearch"
          title="Limpar texto"
          aria-label="Limpar texto da busca"
        >
          ✕
        </button>

        <button
          type="submit"
          class="search-submit-btn"
          title="Executar busca"
          aria-label="Buscar"
        >
          Buscar
        </button>
      </form>

      <!-- Contextual Action Button -->
      <button
        v-if="currentAction"
        type="button"
        class="contextual-action-btn"
        @click="currentAction.action"
      >
        {{ currentAction.label }}
      </button>
    </div>

    <!-- Search Filter Modal -->
    <SearchFilterModal
      v-model="showFilterModal"
      :initial-scope="selectedScope"
      :initial-date="selectedDate"
      :initial-user-id="selectedUserId"
      @apply="handleApplyFilters"
      @clear="handleClearFilters"
    />
  </div>
</template>

<style scoped>
.search-bar-wrapper {
  background-color: #ffffff;
  border-bottom: 1px solid var(--color-border, #D8CDC5);
  padding: 0.5rem 0;
}

.search-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Filter Toggle Button */
.filter-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.65rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #3E2723);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background-color: var(--color-primary-100, #F5EBE1);
  outline: none;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: all 0.15s ease;
}

.filter-toggle-btn:hover {
  background-color: var(--color-primary-200, #EBDCCF);
  border-color: var(--color-primary, #6B3E26);
}

.filter-toggle-btn.has-active {
  background-color: var(--color-primary, #6B3E26);
  color: #ffffff;
  border-color: var(--color-primary-800, #3E2723);
}

.filter-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.filter-badge {
  background-color: #d32f2f;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 0.1rem 0.35rem;
  border-radius: 999px;
  line-height: 1;
}

.filter-toggle-btn.has-active .filter-badge {
  background-color: #ffffff;
  color: var(--color-primary, #6B3E26);
}

/* Search Form and Input */
.search-input-container {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-muted, #8D6E63);
  pointer-events: none;
}

.retro-search-input {
  width: 100%;
  padding: 0.45rem 5rem 0.45rem 2rem;
  font-family: var(--font-body, monospace);
  font-size: 0.85rem;
  color: var(--color-primary-900, #2b1d14);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background-color: var(--color-primary-50, #FFFBF7);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.retro-search-input:focus {
  border-color: var(--color-primary, #6B3E26);
  background-color: #ffffff;
}

.clear-input-btn {
  position: absolute;
  right: 3.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-muted, #8D6E63);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clear-input-btn:hover {
  color: #d32f2f;
}

.search-submit-btn {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--color-primary-100, #F5EBE1);
  color: var(--color-primary-800, #3E2723);
  border: 1px solid var(--color-border, #D8CDC5);
  font-family: var(--font-heading, monospace);
  font-size: 0.72rem;
  font-weight: bold;
  padding: 0.28rem 0.5rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.search-submit-btn:hover {
  background-color: var(--color-primary, #6B3E26);
  color: #ffffff;
  border-color: var(--color-primary, #6B3E26);
}

.contextual-action-btn {
  white-space: nowrap;
  background-color: var(--color-primary, #6B3E26);
  color: #ffffff;
  border: none;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.45rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.contextual-action-btn:hover {
  background-color: var(--color-primary-600, #54311e);
}

@media (max-width: 768px) {
  .filter-btn-text {
    display: none;
  }
  .search-submit-btn {
    display: none;
  }
  .retro-search-input {
    padding-right: 2.2rem;
  }
  .clear-input-btn {
    right: 0.5rem;
  }
  .contextual-action-btn {
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
  }
}
</style>
