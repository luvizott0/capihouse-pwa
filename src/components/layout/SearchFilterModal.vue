<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { User } from '@/types/models'
import { getUsers } from '@/api/users'
import RetroModal from '@/components/ui/RetroModal.vue'

export type SearchScope = 'posts' | 'events' | 'groups'

export interface SearchFilterState {
  scope: SearchScope
  date: string
  userId: number | null
}

const props = defineProps<{
  modelValue: boolean
  initialScope?: SearchScope
  initialDate?: string
  initialUserId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', filters: SearchFilterState): void
  (e: 'clear'): void
}>()

const scope = ref<SearchScope>(props.initialScope || 'posts')
const date = ref(props.initialDate || '')
const userId = ref<number | null>(props.initialUserId ?? null)

const availableUsers = ref<User[]>([])
const isLoadingUsers = ref(false)

async function loadUsers() {
  if (availableUsers.value.length > 0) return
  isLoadingUsers.value = true
  try {
    const res = await getUsers()
    availableUsers.value = res.data || []
  } catch (err) {
    console.error('Erro ao carregar usuários para filtro:', err)
  } finally {
    isLoadingUsers.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    scope.value = props.initialScope || 'posts'
    date.value = props.initialDate || ''
    userId.value = props.initialUserId ?? null
    loadUsers()
  }
})

function handleApply() {
  emit('apply', {
    scope: scope.value,
    date: date.value,
    userId: userId.value,
  })
  emit('update:modelValue', false)
}

function handleClear() {
  date.value = ''
  userId.value = null
  emit('clear')
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal
    :model-value="modelValue"
    title="Filtros de Pesquisa"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="filter-modal-body">
      <!-- Escopo de Busca (Mutuamente exclusivo) -->
      <div class="filter-section">
        <label class="filter-label">Buscar em (escopo):</label>
        <div class="scope-options" role="radiogroup" aria-label="Escopo da busca">
          <label
            class="scope-option"
            :class="{ active: scope === 'posts' }"
          >
            <input
              type="radio"
              name="search-scope"
              value="posts"
              v-model="scope"
              class="sr-only"
            />
            <span class="scope-icon">📝</span>
            <span class="scope-text">Posts</span>
          </label>

          <label
            class="scope-option"
            :class="{ active: scope === 'events' }"
          >
            <input
              type="radio"
              name="search-scope"
              value="events"
              v-model="scope"
              class="sr-only"
            />
            <span class="scope-icon">📅</span>
            <span class="scope-text">Eventos</span>
          </label>

          <label
            class="scope-option"
            :class="{ active: scope === 'groups' }"
          >
            <input
              type="radio"
              name="search-scope"
              value="groups"
              v-model="scope"
              class="sr-only"
            />
            <span class="scope-icon">👥</span>
            <span class="scope-text">Grupos</span>
          </label>
        </div>
      </div>

      <!-- Filtro por Data -->
      <div class="filter-section">
        <div class="filter-label-row">
          <label for="filter-date-input" class="filter-label">Filtrar por data:</label>
          <button
            v-if="date"
            type="button"
            class="clear-field-link"
            @click="date = ''"
          >
            Limpar data
          </button>
        </div>
        <div class="input-with-clear">
          <input
            id="filter-date-input"
            type="date"
            v-model="date"
            class="retro-filter-input"
          />
        </div>
        <small class="filter-hint">
          {{ scope === 'events' ? 'Filtra eventos marcados para este dia.' : 'Filtra publicações ou grupos criados nesta data.' }}
        </small>
      </div>

      <!-- Filtro por Usuário -->
      <div class="filter-section">
        <div class="filter-label-row">
          <label for="filter-user-select" class="filter-label">Filtrar por usuário:</label>
          <button
            v-if="userId !== null"
            type="button"
            class="clear-field-link"
            @click="userId = null"
          >
            Qualquer usuário
          </button>
        </div>
        <select
          id="filter-user-select"
          v-model="userId"
          class="retro-filter-select"
          :disabled="isLoadingUsers"
        >
          <option :value="null">-- Todos os usuários --</option>
          <option
            v-for="user in availableUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.name }} (@{{ user.username }})
          </option>
        </select>
        <small class="filter-hint">
          {{ scope === 'groups' ? 'Filtra grupos criados por este usuário.' : 'Filtra posts ou eventos criados por este usuário.' }}
        </small>
      </div>
    </div>

    <template #footer>
      <div class="filter-modal-actions">
        <button
          type="button"
          class="btn-clear-filters"
          @click="handleClear"
        >
          [ Limpar ]
        </button>
        <button
          type="button"
          class="btn-apply-filters"
          @click="handleApply"
        >
          [ Aplicar Filtros ]
        </button>
      </div>
    </template>
  </RetroModal>
</template>

<style scoped>
.filter-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 0.25rem 0;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-900, #3E2723);
}

.clear-field-link {
  background: none;
  border: none;
  color: var(--color-primary, #6B3E26);
  font-size: 0.72rem;
  font-family: var(--font-heading, monospace);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.clear-field-link:hover {
  color: #d32f2f;
}

.filter-hint {
  font-size: 0.7rem;
  color: #795548;
  font-style: italic;
}

/* Escopo selector */
.scope-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.scope-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.25rem;
  background-color: var(--color-primary-50, #FFFBF7);
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.scope-option:hover {
  background-color: var(--color-primary-100, #F5EBE1);
  border-color: var(--color-primary-400, #A06D4E);
}

.scope-option.active {
  background-color: var(--color-primary, #6B3E26);
  border-color: var(--color-primary-800, #3E2723);
  color: #ffffff;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.scope-icon {
  font-size: 1.25rem;
  margin-bottom: 0.2rem;
}

.scope-text {
  font-family: var(--font-heading, monospace);
  font-size: 0.78rem;
  font-weight: bold;
}

.scope-option.active .scope-text {
  color: #ffffff;
}

/* Inputs */
.retro-filter-input,
.retro-filter-select {
  width: 100%;
  padding: 0.5rem 0.6rem;
  font-family: var(--font-body, monospace);
  font-size: 0.85rem;
  color: var(--color-primary-900, #2b1d14);
  background-color: var(--color-primary-50, #FFFBF7);
  border: 1px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}

.retro-filter-input:focus,
.retro-filter-select:focus {
  border-color: var(--color-primary, #6B3E26);
  background-color: #ffffff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Modal Actions */
.filter-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

.btn-clear-filters {
  background: none;
  border: 1px solid var(--color-border, #D8CDC5);
  padding: 0.45rem 0.8rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800, #3E2723);
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s ease;
}
.btn-clear-filters:hover {
  background-color: #f0ebe6;
  color: #d32f2f;
}

.btn-apply-filters {
  background-color: var(--color-primary, #6B3E26);
  border: 1px solid var(--color-primary-800, #3E2723);
  padding: 0.45rem 0.9rem;
  font-family: var(--font-heading, monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: #ffffff;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s ease;
}
.btn-apply-filters:hover {
  background-color: var(--color-primary-600, #54311e);
}
</style>
