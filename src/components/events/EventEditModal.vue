<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { User, Event as EventModel } from '@/types/models'
import { useEventsStore } from '@/stores/events'
import { useAuthStore } from '@/stores/auth'
import { getUsers } from '@/api/users'
import { resolveMediaUrl } from '@/utils/media'
import RetroModal from '@/components/ui/RetroModal.vue'
import RetroButton from '@/components/ui/RetroButton.vue'
import RetroInput from '@/components/ui/RetroInput.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'

const props = defineProps<{
  modelValue: boolean
  event: EventModel
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'updated'): void
}>()

const eventsStore = useEventsStore()
const authStore = useAuthStore()

const name = ref('')
const description = ref('')
const eventDate = ref('')
const eventTime = ref('')
const selectedBlob = ref<Blob | null>(null)
const imagePreview = ref<string | null>(null)
const showCropper = ref(false)
const initialCropperImage = ref<string | null>(null)
const selectedGuestIds = ref<number[]>([])
const guestSearch = ref('')
const availableUsers = ref<User[]>([])
const isLoadingUsers = ref(false)
const errorMsg = ref('')

function parseEventDateTime(dateStr: string) {
  if (!dateStr) return { date: '', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function initForm() {
  if (!props.event) return
  name.value = props.event.name || ''
  description.value = props.event.description || ''
  const parsed = parseEventDateTime(props.event.date)
  eventDate.value = parsed.date
  eventTime.value = parsed.time
  selectedGuestIds.value = props.event.guests ? props.event.guests.map(g => g.id) : []
  selectedBlob.value = null
  initialCropperImage.value = null
  const rawImage = props.event.image_url || props.event.media?.[0]?.url || props.event.media?.[0]?.path || null
  imagePreview.value = rawImage ? resolveMediaUrl(rawImage) : null
  guestSearch.value = ''
  errorMsg.value = ''
}

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

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      initForm()
      loadUsers()
    }
  },
  { immediate: true }
)

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
    initialCropperImage.value = URL.createObjectURL(file)
    showCropper.value = true
    input.value = ''
  }
}

function handleImageCropped(blob: Blob) {
  selectedBlob.value = blob
  imagePreview.value = URL.createObjectURL(blob)
  showCropper.value = false
}

function removeImage() {
  selectedBlob.value = null
  imagePreview.value = null
  initialCropperImage.value = null
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!name.value.trim() || !description.value.trim() || !eventDate.value || !eventTime.value) {
    errorMsg.value = 'Preencha todos os campos obrigatórios (nome, data, horário e descrição).'
    return
  }

  const combinedDateTime = `${eventDate.value}T${eventTime.value}`

  const formData = new FormData()
  formData.append('name', name.value.trim())
  formData.append('description', description.value.trim())
  formData.append('date', combinedDateTime)
  if (selectedBlob.value) {
    formData.append('image', selectedBlob.value, 'event-banner.webp')
  }

  if (selectedGuestIds.value.length > 0) {
    selectedGuestIds.value.forEach(id => {
      formData.append('guests[]', id.toString())
    })
  } else {
    formData.append('clear_guests', '1')
  }

  try {
    await eventsStore.updateEvent(props.event.id, formData)
    emit('updated')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'Erro ao salvar alterações do evento.'
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<template>
  <RetroModal :modelValue="modelValue" @update:modelValue="handleClose" title="» Editar Evento" size="md">
    <div class="event-edit-form">
      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <RetroInput v-model="name" label="Nome do Evento" placeholder="Ex: Churrasco da Capivara" required />

      <!-- Data e Horário separados -->
      <div class="datetime-grid">
        <div class="form-group datetime-field">
          <label class="form-label">Data do Evento *</label>
          <input v-model="eventDate" type="date" class="retro-field" required />
        </div>
        <div class="form-group datetime-field">
          <label class="form-label">Horário *</label>
          <input v-model="eventTime" type="time" class="retro-field" required />
        </div>
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
        <label class="form-label">
          Foto de Capa (Banner)
          <span class="muted-note">(formato retangular 3:1 recomendado, deixe vazio para manter a atual)</span>
        </label>
        <div class="photo-upload-row">
          <label class="upload-btn">
            <input type="file" accept="image/*" @change="handleImageSelect" class="hidden-input" />
            📷 {{ imagePreview ? '[ Alterar Foto de Capa ]' : '[ Escolher Foto de Capa ]' }}
          </label>
        </div>
        <div v-if="imagePreview" class="preview-box">
          <img :src="imagePreview" alt="Capa do evento" class="preview-img" />
          <button type="button" class="remove-preview-btn" @click="removeImage" title="Remover foto">
            [ Remover foto ]
          </button>
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
          Salvar Alterações
        </RetroButton>
      </div>
    </div>
  </RetroModal>

  <!-- Cover Cropper Modal -->
  <ImageCropper
    v-model="showCropper"
    :aspectRatio="3 / 1"
    title="Editar Banner do Evento"
    formatNote="Formato retangular recomendado (corte panorâmico)"
    :initialImage="initialCropperImage"
    @cropped="handleImageCropped"
  />
</template>

<style scoped>
.photo-upload-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: var(--color-primary-50, #f8f6f1);
  border: 1px dashed var(--color-primary-300, #c4884e);
  color: var(--color-primary-800, #5f4120);
  padding: 0.45rem 0.85rem;
  border-radius: 2px;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s ease;
}
.upload-btn:hover {
  background-color: var(--color-primary-100, #faede0);
  border-color: var(--color-primary, #a66130);
}

.hidden-input {
  display: none;
}

.preview-box {
  margin-top: 0.5rem;
  position: relative;
  width: 100%;
  height: 110px;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  overflow: hidden;
  background-color: var(--color-primary-100, #faede0);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-preview-btn {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-family: var(--font-heading);
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
}
.remove-preview-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.event-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.datetime-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .datetime-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

.datetime-field {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
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
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.form-label {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800);
}

.retro-field, .retro-textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
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
  position: relative;
  margin-top: 0.5rem;
  max-height: 140px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 2px;
}
.preview-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.remove-preview-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.8);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.remove-preview-btn:hover {
  background-color: #b91c1c;
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
  max-height: 140px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  background: #ffffff;
  border-radius: 2px;
  scrollbar-width: thin;
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
  position: sticky;
  bottom: -1rem;
  background-color: var(--bg-white, #ffffff);
  z-index: 10;
  margin-top: 0.5rem;
  padding-bottom: 0.25rem;
}
</style>
