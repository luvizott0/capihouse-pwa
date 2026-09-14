<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { User } from '@/types/models'
import { useEventsStore } from '@/stores/events'
import { useAuthStore } from '@/stores/auth'
import { getUsers } from '@/api/users'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'created'): void }>()

const eventsStore = useEventsStore()
const authStore = useAuthStore()

const name = ref('')
const description = ref('')
const date = ref('')
const selectedImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const selectedGuestIds = ref<number[]>([])
const guestSearch = ref('')
const availableUsers = ref<User[]>([])
const isLoadingUsers = ref(false)
const errorMsg = ref('')

async function loadUsers() {
  isLoadingUsers.value = true
  try {
    const res = await getUsers()
    const all = res.data || []
    availableUsers.value = all.filter(u => u.id !== authStore.user?.id)
  } catch {
    availableUsers.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadUsers()
  }
})

const filteredUsers = computed(() => {
  if (!guestSearch.value.trim()) return availableUsers.value
  const q = guestSearch.value.toLowerCase()
  return availableUsers.value.filter(u =>
    u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
  )
})

function toggleGuest(userId: number) {
  const idx = selectedGuestIds.value.indexOf(userId)
  if (idx > -1) {
    selectedGuestIds.value.splice(idx, 1)
  } else {
    selectedGuestIds.value.push(userId)
  }
}

function handleImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectedImage.value = file
    imagePreview.value = URL.createObjectURL(file)
  }
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!name.value.trim() || !description.value.trim() || !date.value) {
    errorMsg.value = 'Preencha todos os campos obrigatórios.'
    return
  }

  const formData = new FormData()
  formData.append('name', name.value.trim())
  formData.append('description', description.value.trim())
  formData.append('date', date.value)
  if (selectedImage.value) {
    formData.append('image', selectedImage.value)
  }

  selectedGuestIds.value.forEach(id => {
    formData.append('guests[]', id.toString())
  })

  try {
    await eventsStore.createEvent(formData)
    name.value = ''
    description.value = ''
    date.value = ''
    selectedImage.value = null
    imagePreview.value = null
    selectedGuestIds.value = []
    guestSearch.value = ''
    emit('created')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Erro ao criar evento.'
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Novo Evento" size="md">
    <div class="event-create-form">
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <RetroInput v-model="name" label="Nome do Evento" placeholder="Ex: Churrasco da Capivara" required />

      <div class="form-group">
        <label class="form-label">Data e Hora *</label>
        <input v-model="date" type="datetime-local" class="retro-field" required />
      </div>

      <div class="form-group">
        <label class="form-label">Descrição do Evento *</label>
        <textarea
          v-model="description"
          rows="3"
          placeholder="Conte mais sobre o evento..."
          class="retro-textarea"
          required
        ></textarea>
      </div>

      <!-- Image upload -->
      <div class="form-group">
        <label class="form-label">Foto de Capa</label>
        <input type="file" accept="image/*" @change="handleImageSelect" class="retro-field" />
        <div v-if="imagePreview" class="preview-box">
          <img :src="imagePreview" alt="Capa do evento" class="preview-img" />
        </div>
      </div>

      <!-- Guests selection -->
      <div class="form-group">
        <label class="form-label">
          Convidar Amigos da Casa
          <span class="muted-note">(visível apenas para os convidados)</span>
        </label>
        
        <input
          v-model="guestSearch"
          type="text"
          placeholder="Buscar amigos..."
          class="retro-field guest-search-field"
        />

        <div v-if="isLoadingUsers" class="loading-users-text">
          Carregando lista de amigos...
        </div>
        <div v-else-if="filteredUsers.length" class="guests-selector-list">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="guest-selector-item"
            :class="{ selected: selectedGuestIds.includes(user.id) }"
            @click="toggleGuest(user.id)"
          >
            <input
              type="checkbox"
              :checked="selectedGuestIds.includes(user.id)"
              class="retro-checkbox"
              @click.stop="toggleGuest(user.id)"
            />
            <UserAvatar :user="user" size="sm" />
            <div class="guest-info">
              <div class="guest-name">{{ user.name }}</div>
              <div class="guest-handle">@{{ user.username }}</div>
            </div>
          </div>
        </div>
        <div v-else class="no-users-found">
          Nenhum amigo encontrado.
        </div>

        <div v-if="selectedGuestIds.length" class="selected-count-line">
          {{ selectedGuestIds.length }} {{ selectedGuestIds.length === 1 ? 'amigo selecionado' : 'amigos selecionados' }}
        </div>
      </div>

      <div class="modal-footer">
        <RetroButton variant="secondary" @click="handleClose">Cancelar</RetroButton>
        <RetroButton :loading="eventsStore.isSubmitting" @click="handleSubmit">
          Criar Evento
        </RetroButton>
      </div>
    </div>
  </RetroModal>
</template>

<style scoped>
.event-create-form {
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
  gap: 0.25rem;
}

.form-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.retro-field, .retro-textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  font-family: var(--font-body);
  border: 2px solid var(--color-primary-200);
  background-color: var(--color-primary-50);
  border-radius: 2px;
  outline: none;
}
.retro-field:focus, .retro-textarea:focus {
  border-color: var(--color-primary);
}

.preview-box {
  margin-top: 0.5rem;
  max-height: 160px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 2px;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.muted-note {
  font-size: 0.75rem;
  color: var(--color-muted, #847062);
  font-weight: normal;
  margin-left: 0.35rem;
}

.guest-search-field {
  margin-bottom: 0.5rem;
}

.loading-users-text,
.no-users-found {
  font-size: 0.8rem;
  color: var(--color-muted, #847062);
  padding: 0.5rem 0;
  text-align: center;
}

.guests-selector-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
}

.guest-selector-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  border-bottom: 1px solid var(--color-primary-50, #f8f6f1);
  transition: background-color 0.15s;
}

.guest-selector-item:hover,
.guest-selector-item.selected {
  background-color: var(--color-primary-50, #f8f6f1);
}

.guest-info {
  flex: 1;
  min-width: 0;
}

.guest-name {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.guest-handle {
  font-size: 0.7rem;
  color: var(--color-muted, #847062);
}

.retro-checkbox {
  cursor: pointer;
  accent-color: var(--color-primary);
}

.selected-count-line {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-family: var(--font-heading, 'Space Mono', monospace);
  margin-top: 0.35rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.75rem;
}
</style>
