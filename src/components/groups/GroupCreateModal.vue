<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupsStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import * as usersApi from '@/api/users'
import type { User } from '@/types/models'
import axios from 'axios'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void; (e: 'created'): void }>()

const router = useRouter()
const groupsStore = useGroupsStore()
const authStore = useAuthStore()

const name = ref('')
const description = ref('')
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const errorMsg = ref('')
const isSubmitting = ref(false)

const availableUsers = ref<User[]>([])
const selectedUserIds = ref<number[]>([])
const searchUserQuery = ref('')

onMounted(async () => {
  try {
    const res = await usersApi.getUsers()
    // Exclude currently authenticated user
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

function handlePhotoChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || !input.files[0]) return
  const file = input.files[0]
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}

function removePhoto() {
  photoFile.value = null
  photoPreview.value = null
}

function toggleUserInvite(userId: number) {
  const index = selectedUserIds.value.indexOf(userId)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(userId)
  }
}

async function handleCreate() {
  errorMsg.value = ''
  if (!name.value.trim()) {
    errorMsg.value = 'O nome do grupo é obrigatório.'
    return
  }

  isSubmitting.value = true
  const formData = new FormData()
  formData.append('name', name.value.trim())
  if (description.value.trim()) {
    formData.append('description', description.value.trim())
  }
  if (photoFile.value) {
    formData.append('photo', photoFile.value)
  }
  selectedUserIds.value.forEach(id => {
    formData.append('invites[]', id.toString())
  })

  try {
    const createdGroup = await groupsStore.createGroup(formData)
    // Reset form
    name.value = ''
    description.value = ''
    photoFile.value = null
    photoPreview.value = null
    selectedUserIds.value = []
    emit('created')
    emit('update:modelValue', false)
    router.push(`/groups/${createdGroup.id}`)
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      errorMsg.value = err.response.data.message
    } else {
      errorMsg.value = 'Erro ao criar grupo.'
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
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Criar Novo Grupo" size="md">
    <div class="group-form">
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <!-- Group Name -->
      <div class="form-group">
        <label class="field-label">Nome do Grupo *</label>
        <input
          v-model="name"
          type="text"
          class="retro-input"
          placeholder="Ex: Capivaras do Fim de Semana"
          maxlength="255"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label class="field-label">Descrição</label>
        <textarea
          v-model="description"
          rows="3"
          class="retro-input"
          placeholder="Sobre o que é este grupo?..."
          maxlength="2000"
        ></textarea>
      </div>

      <!-- Group Photo Upload -->
      <div class="form-group">
        <label class="field-label">
          Foto de Capa do Grupo
          <span class="muted-note">(formato retangular recomendado)</span>
        </label>
        <div class="photo-upload-row">
          <div v-if="photoPreview" class="photo-preview-box">
            <img :src="photoPreview" alt="Foto do grupo" class="preview-img" />
            <button type="button" class="remove-photo-btn" @click="removePhoto">×</button>
          </div>
          <label class="upload-btn">
            <input type="file" accept="image/*" class="hidden-input" @change="handlePhotoChange" />
            📷 [ Escolher Foto ]
          </label>
        </div>
      </div>

      <!-- Invite Friends -->
      <div class="form-group">
        <label class="field-label">Convidar Amigos da Casa (opcional)</label>
        <input
          v-model="searchUserQuery"
          type="text"
          class="retro-input user-search-input"
          placeholder="Buscar amigos por nome..."
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
      </div>

      <!-- Footer Buttons -->
      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton :loading="isSubmitting" @click="handleCreate">
          Criar Grupo
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.group-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-banner {
  padding: 0.5rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  color: #b91c1c;
  font-size: 0.85rem;
  border-radius: 2px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  text-transform: uppercase;
}

.photo-upload-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.photo-preview-box {
  position: relative;
  width: 60px;
  height: 60px;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-photo-btn {
  position: absolute;
  top: 1px;
  right: 1px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden-input {
  display: none;
}

.upload-btn {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  background-color: var(--color-primary-100);
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  display: inline-block;
}
.upload-btn:hover {
  background-color: var(--color-primary-200);
}

.user-search-input {
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}

.users-selection-list {
  max-height: 160px;
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
  margin-top: 0.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}
</style>
