<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGroupsStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/users'
import type { User, Group } from '@/types/models'
import axios from 'axios'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps<{ modelValue: boolean; group: Group }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void; (e: 'invited'): void }>()

const groupsStore = useGroupsStore()
const authStore = useAuthStore()

const availableUsers = ref<User[]>([])
const selectedUserIds = ref<number[]>([])
const searchUserQuery = ref('')
const isSubmitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

onMounted(async () => {
  try {
    const res = await usersApi.getUsers()
    // Exclude current user
    availableUsers.value = res.data.filter(u => u.id !== authStore.user?.id)
  } catch {
    // Silent
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
    await groupsStore.inviteUsers(props.group.id, selectedUserIds.value)
    successMsg.value = 'Convites enviados com sucesso!'
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
      errorMsg.value = 'Erro ao enviar convites.'
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
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Convidar Amigos" size="md">
    <div class="invite-form">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-banner">{{ successMsg }}</div>

      <p class="invite-instructions">
        Convide outros amigos da casa para participar do grupo <strong>{{ group.name }}</strong>:
      </p>

      <input
        v-model="searchUserQuery"
        type="text"
        class="retro-input"
        placeholder="Buscar amigos por nome ou @username..."
      />

      <div class="users-selection-list">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-select-item"
          :class="{ selected: selectedUserIds.includes(user.id) }"
          @click="toggleUserInvite(user.id)"
        >
          <input
            type="checkbox"
            :checked="selectedUserIds.includes(user.id)"
            class="user-checkbox"
            @click.stop="toggleUserInvite(user.id)"
          />
          <UserAvatar :user="user" size="sm" />
          <div class="user-meta">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-handle">@{{ user.username }}</span>
          </div>
        </div>
      </div>

      <div v-if="selectedUserIds.length" class="selected-count-hint">
        {{ selectedUserIds.length }} {{ selectedUserIds.length === 1 ? 'convite selecionado' : 'convites selecionados' }}
      </div>

      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Fechar</RetroButton>
        <RetroButton :loading="isSubmitting" @click="handleSendInvites">
          Enviar Convites
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.invite-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
  font-weight: bold;
  font-family: var(--font-heading);
  border-radius: 2px;
}

.invite-instructions {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.users-selection-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-primary-50);
  display: flex;
  flex-direction: column;
}

.user-select-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}
.user-select-item:last-child {
  border-bottom: none;
}
.user-select-item:hover {
  background-color: var(--color-primary-100);
}
.user-select-item.selected {
  background-color: var(--color-primary-200);
}

.user-checkbox {
  cursor: pointer;
  accent-color: var(--color-primary);
}

.user-meta {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
}
.user-handle {
  font-size: 0.7rem;
  color: var(--color-muted);
}

.selected-count-hint {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: bold;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}
</style>
