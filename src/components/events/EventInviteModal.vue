<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/users'
import * as eventsApi from '@/api/events'
import type { User, Event } from '@/types/models'
import axios from 'axios'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps<{ modelValue: boolean; event: Event }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void; (e: 'invited'): void }>()

const authStore = useAuthStore()

const availableUsers = ref<User[]>([])
const selectedUserIds = ref<number[]>([])
const searchUserQuery = ref('')
const isSubmitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

async function loadUsers() {
  try {
    const res = await usersApi.getUsers()
    // Exclude current user and already invited guests
    const existingGuestIds = new Set(props.event.guests?.map(g => g.id) || [])
    existingGuestIds.add(props.event.user_id)
    if (authStore.user?.id) {
      existingGuestIds.add(authStore.user.id)
    }

    availableUsers.value = res.data.filter(u => !existingGuestIds.has(u.id))
  } catch {
    // Silent
  }
}

onMounted(() => {
  loadUsers()
})

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    selectedUserIds.value = []
    searchUserQuery.value = ''
    errorMsg.value = ''
    successMsg.value = ''
    loadUsers()
  }
})

const filteredUsers = computed(() => {
  if (!searchUserQuery.value.trim()) return availableUsers.value
  const q = searchUserQuery.value.toLowerCase()
  return availableUsers.value.filter(
    u => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  )
})

function toggleUserInvite(userId: number) {
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(userId)
  }
}

async function handleSendInvites() {
  if (selectedUserIds.value.length === 0) {
    errorMsg.value = 'Selecione pelo menos um amigo para convidar.'
    return
  }

  isSubmitting.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    await eventsApi.inviteEventGuests(props.event.id, selectedUserIds.value)
    successMsg.value = 'Convidados adicionados com sucesso!'
    selectedUserIds.value = []
    emit('invited')
    setTimeout(() => {
      emit('update:modelValue', false)
      successMsg.value = ''
    }, 1200)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao adicionar convidados.'
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
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Convidar Amigos para o Evento" size="md">
    <div class="invite-form">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-banner">{{ successMsg }}</div>

      <p class="invite-intro">
        Selecione amigos da casa para convidar para <strong>{{ event.name }}</strong>.
        Eles poderão visualizar o evento, confirmar presença e participar das publicações.
      </p>

      <!-- Search Field -->
      <div class="search-box">
        <input
          v-model="searchUserQuery"
          type="text"
          placeholder="Buscar amigos por nome ou @username..."
          class="retro-input"
        />
      </div>

      <!-- Users List -->
      <div v-if="filteredUsers.length" class="users-list">
        <div
          v-for="u in filteredUsers"
          :key="u.id"
          class="user-item"
          :class="{ selected: selectedUserIds.includes(u.id) }"
          @click="toggleUserInvite(u.id)"
        >
          <div class="user-info">
            <UserAvatar :user="u" size="sm" />
            <div class="user-names">
              <span class="name">{{ u.name }}</span>
              <span class="username">@{{ u.username }}</span>
            </div>
          </div>
          <div class="checkbox-indicator">
            <span v-if="selectedUserIds.includes(u.id)">[✓]</span>
            <span v-else>[ ]</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-list">
        {{ searchUserQuery ? 'Nenhum amigo encontrado na busca.' : 'Todos os amigos da casa já foram convidados!' }}
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        <span class="selected-count">
          {{ selectedUserIds.length }} {{ selectedUserIds.length === 1 ? 'amigo selecionado' : 'amigos selecionados' }}
        </span>
        <div class="actions">
          <RetroButton variant="secondary" @click="handleClose">
            Cancelar
          </RetroButton>
          <RetroButton
            variant="primary"
            :disabled="isSubmitting || selectedUserIds.length === 0"
            @click="handleSendInvites"
          >
            {{ isSubmitting ? 'Enviando...' : 'Convidar (' + selectedUserIds.length + ')' }}
          </RetroButton>
        </div>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.invite-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-intro {
  font-size: 0.85rem;
  color: #333333;
  line-height: 1.4;
  margin: 0;
}

.error-banner {
  padding: 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.success-banner {
  padding: 0.5rem;
  background-color: #dcfce7;
  border: 1px solid #22c55e;
  color: #15803d;
  font-size: 0.85rem;
  border-radius: 2px;
}

.retro-input {
  width: 100%;
  padding: 0.5rem 0.6rem;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-primary-50);
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
.retro-input:focus {
  border-color: var(--color-primary);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  padding: 0.5rem;
  background-color: #ffffff;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.user-item:hover {
  background-color: var(--color-primary-100);
}
.user-item.selected {
  background-color: var(--color-primary-100);
  border-color: var(--color-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-names {
  display: flex;
  flex-direction: column;
}

.name {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-900);
}

.username {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.checkbox-indicator {
  font-family: var(--font-heading);
  font-weight: bold;
  color: var(--color-primary);
}

.empty-list {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-muted);
  border: 1px dashed var(--color-border);
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}

.selected-count {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--color-muted);
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
