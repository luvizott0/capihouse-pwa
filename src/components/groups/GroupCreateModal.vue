<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useGroupsStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/users'
import type { User, Group } from '@/types/models'
import axios from 'axios'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps<{
  modelValue: boolean
  group?: Group | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'created'): void
  (e: 'updated'): void
}>()

const groupsStore = useGroupsStore()
const authStore = useAuthStore()

const PRESET_COLORS = [
  { name: 'Capivara', hex: '#a66130' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Azul', hex: '#0284c7' },
  { name: 'Roxo', hex: '#8b5cf6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Turquesa', hex: '#0d9488' },
  { name: 'Grafite', hex: '#475569' },
]

const name = ref('')
const selectedColor = ref('#a66130')
const description = ref('')
const errorMsg = ref('')
const isSubmitting = ref(false)

const availableUsers = ref<User[]>([])
const selectedUserIds = ref<number[]>([])
const searchUserQuery = ref('')

onMounted(async () => {
  await loadAvailableUsers()
})

async function loadAvailableUsers() {
  try {
    const res = await usersApi.getUsers()
    availableUsers.value = res.data.filter(u => u.id !== authStore.user?.id)
  } catch {
    // Silent
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      errorMsg.value = ''
      searchUserQuery.value = ''
      if (props.group) {
        name.value = props.group.name || ''
        selectedColor.value = props.group.color || '#a66130'
        description.value = props.group.description || ''
        selectedUserIds.value = (props.group.members || []).map(m => m.id)
      } else {
        name.value = ''
        selectedColor.value = '#a66130'
        description.value = ''
        selectedUserIds.value = []
      }
      if (availableUsers.value.length === 0) {
        loadAvailableUsers()
      }
    }
  },
  { immediate: true }
)

const filteredUsers = computed(() => {
  if (!searchUserQuery.value.trim()) return availableUsers.value
  const q = searchUserQuery.value.toLowerCase()
  return availableUsers.value.filter(
    u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  )
})

function toggleUser(userId: number) {
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(userId)
  }
}

async function handleSubmit() {
  errorMsg.value = ''
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    errorMsg.value = 'O nome do grupo é obrigatório.'
    return
  }
  if (trimmedName.length > 25) {
    errorMsg.value = 'O nome do grupo deve ter no máximo 25 caracteres.'
    return
  }

  isSubmitting.value = true

  const payload = {
    name: trimmedName,
    color: selectedColor.value,
    description: description.value.trim() || undefined,
    members: selectedUserIds.value,
  }

  try {
    if (props.group?.id) {
      await groupsStore.updateGroup(props.group.id, payload)
      emit('updated')
    } else {
      await groupsStore.createGroup(payload)
      emit('created')
    }
    emit('update:modelValue', false)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao salvar grupo. Tente novamente.'
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal
    :modelValue="modelValue"
    @update:modelValue="handleClose"
    :title="props.group ? '» Editar Grupo de Filtro' : '» Novo Grupo de Filtro'"
    size="md"
  >
    <div class="group-form">
      <div v-if="errorMsg" class="error-banner">
        ⚠️ {{ errorMsg }}
      </div>

      <!-- Context note -->
      <div class="privacy-notice">
        <span class="notice-icon">🔒</span>
        <span class="notice-text">
          Este grupo funciona como um <strong>filtro privado</strong> para suas publicações. Outros usuários não verão este grupo, apenas os posts que você compartilhar nele.
        </span>
      </div>

      <!-- Group Name with 25-char limit counter -->
      <div class="form-group">
        <div class="field-label-row">
          <label class="field-label">Nome do Grupo *</label>
          <span class="char-counter" :class="{ 'at-limit': name.length >= 25 }">
            {{ name.length }}/25
          </span>
        </div>
        <input
          v-model="name"
          type="text"
          class="retro-input"
          placeholder="Ex: Melhores Amigos, Família..."
          maxlength="25"
        />
      </div>

      <!-- Color Selector -->
      <div class="form-group">
        <label class="field-label">Cor de Identificação</label>
        <div class="color-palette">
          <button
            v-for="color in PRESET_COLORS"
            :key="color.hex"
            type="button"
            class="color-circle"
            :class="{ active: selectedColor === color.hex }"
            :style="{ backgroundColor: color.hex }"
            :title="color.name"
            @click="selectedColor = color.hex"
          >
            <span v-if="selectedColor === color.hex" class="color-check">✓</span>
          </button>
        </div>

        <!-- Live Preview Badge -->
        <div class="preview-badge-row">
          <span class="preview-label">Prévia:</span>
          <span class="group-preview-pill" :style="{ borderColor: selectedColor, color: selectedColor }">
            <span class="color-dot" :style="{ backgroundColor: selectedColor }"></span>
            {{ name.trim() || 'Nome do Grupo' }}
          </span>
        </div>
      </div>

      <!-- Members Selector -->
      <div class="form-group">
        <div class="field-label-row">
          <label class="field-label">Pessoas com Acesso (Filtro)</label>
          <span class="selected-count-badge">
            {{ selectedUserIds.length }} {{ selectedUserIds.length === 1 ? 'pessoa' : 'pessoas' }}
          </span>
        </div>


        <!-- Search input -->
        <input
          v-model="searchUserQuery"
          type="text"
          class="retro-input user-search-input"
          placeholder="🔍 Buscar amigos por nome ou @username..."
        />

        <!-- Scrollable Users List -->
        <div class="users-selection-list">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="user-select-item"
            :class="{ selected: selectedUserIds.includes(user.id) }"
            @click="toggleUser(user.id)"
          >
            <input
              type="checkbox"
              :checked="selectedUserIds.includes(user.id)"
              class="user-checkbox"
              @click.stop="toggleUser(user.id)"
            />
            <UserAvatar :user="user" size="sm" />
            <div class="user-meta">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-handle">@{{ user.username }}</span>
            </div>
          </div>
          <div v-if="filteredUsers.length === 0" class="no-users-found">
            Nenhum amigo encontrado com essa busca.
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton :loading="isSubmitting" @click="handleSubmit">
          {{ props.group ? 'Salvar Alterações' : 'Criar Grupo' }}
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.group-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.error-banner {
  padding: 0.6rem 0.8rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
  font-family: var(--font-body, sans-serif);
}

.privacy-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  background-color: var(--color-primary-50, #fcf9f5);
  border: 1px solid var(--color-primary-200, #e9d5c2);
  border-radius: 3px;
  font-size: 0.82rem;
  color: var(--color-primary-900, #38200a);
  line-height: 1.4;
}

.notice-icon {
  font-size: 1rem;
  line-height: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-family: var(--font-heading, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text, #2c2523);
}

.char-counter {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  color: #6b7280;
}

.char-counter.at-limit {
  color: #dc2626;
  font-weight: bold;
}

.retro-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background: #ffffff;
  font-family: var(--font-body, sans-serif);
  font-size: 0.9rem;
  color: var(--color-text, #2c2523);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease;
}

.retro-input:focus {
  border-color: var(--color-primary, #a66130);
}

/* Color Palette */
.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.color-circle {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, border-color 0.15s ease;
  padding: 0;
}

.color-circle:hover {
  transform: scale(1.1);
}

.color-circle.active {
  border-color: #000000;
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #000000;
  transform: scale(1.1);
}

.color-check {
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.preview-badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.85rem;
}

.preview-label {
  font-family: var(--font-heading, monospace);
  color: #6b7280;
  font-size: 0.78rem;
}

.group-preview-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  background-color: #ffffff;
  border: 1.5px solid currentColor;
  border-radius: 12px;
  font-family: var(--font-heading, monospace);
  font-size: 0.82rem;
  font-weight: bold;
}

.color-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
}

/* Selected User Chips */
.selected-count-badge {
  font-family: var(--font-heading, monospace);
  font-size: 0.75rem;
  color: var(--color-primary, #a66130);
  font-weight: bold;
}



.user-search-input {
  font-size: 0.85rem;
  padding: 0.45rem 0.65rem;
}

.users-selection-list {
  max-height: 12rem;
  overflow-y: auto;
  border: 2px solid var(--color-border, #D8CDC5);
  border-radius: 2px;
  background: #ffffff;
}

.user-select-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid #f3ece5;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.user-select-item:hover {
  background-color: #fbf8f5;
}

.user-select-item.selected {
  background-color: var(--color-primary-100, #f8efe6);
}

.user-checkbox {
  cursor: pointer;
  accent-color: var(--color-primary, #a66130);
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text, #2c2523);
}

.user-handle {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: var(--font-heading, monospace);
}

.no-users-found {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.82rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #D8CDC5);
}
</style>
