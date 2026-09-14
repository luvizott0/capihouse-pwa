<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits<{ (e: 'open-create-post'): void; (e: 'open-create-event'): void }>()

const route = useRoute()
const router = useRouter()

const scope = computed({
  get() {
    if (route.path.startsWith('/events')) return 'events'
    if (route.path.startsWith('/groups')) return 'groups'
    if (route.path.startsWith('/profile')) return 'profile'
    if (route.path.startsWith('/admin')) return 'admin'
    return 'feed'
  },
  set(val: string) {
    if (val === 'feed') router.push('/feed')
    else if (val === 'events') router.push('/events')
    else if (val === 'groups') router.push('/groups')
    else if (val === 'profile') router.push('/profile')
    else if (val === 'admin') router.push('/admin/users')
  }
})

const currentAction = computed(() => {
  if (scope.value === 'feed') {
    return { label: '[ + Criar post ]', action: () => emit('open-create-post') }
  }
  if (scope.value === 'events') {
    return { label: '[ + Novo Evento ]', action: () => emit('open-create-event') }
  }
  return null
})
</script>

<template>
  <div class="search-bar-wrapper">
    <div class="search-inner">
      <!-- Scope Selector -->
      <select v-model="scope" class="scope-select" aria-label="Selecionar tipo de pesquisa">
        <option value="feed">Feed</option>
        <option value="groups">Grupos</option>
        <option value="profile">Perfil</option>
        <option value="events">Eventos</option>
        <option value="admin">Admin</option>
      </select>

      <!-- Search Input (Visual) -->
      <div class="search-input-container">
        <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar no CapiHouse..."
          class="retro-search-input"
          readonly
        />
      </div>

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

.scope-select {
  padding: 0.45rem 0.6rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-primary-100);
  outline: none;
  cursor: pointer;
}
.scope-select:focus {
  border-color: var(--color-primary);
}

.search-input-container {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-muted);
}

.retro-search-input {
  width: 100%;
  padding: 0.45rem 0.6rem 0.45rem 2rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-primary-50);
  outline: none;
}

.contextual-action-btn {
  white-space: nowrap;
  background-color: var(--color-primary);
  color: #ffffff;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  padding: 0.45rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.contextual-action-btn:hover {
  background-color: var(--color-primary-600);
}

@media (max-width: 768px) {
  .contextual-action-btn {
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
  }
}
</style>
