<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Event } from '@/types/models'
import { useEventsStore } from '@/stores/events'
import { useAuthStore } from '@/stores/auth'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import EventEditModal from '@/components/events/EventEditModal.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
import { resolveMediaUrl } from '@/utils/media'

const props = defineProps<{ event: Event }>()

const router = useRouter()
const eventsStore = useEventsStore()
const authStore = useAuthStore()

const isOwner = computed(() => {
  return authStore.user?.id === props.event.user_id || authStore.isAdmin
})

const myGuestRecord = computed(() => {
  const currentUserId = authStore.user?.id
  if (!currentUserId || !props.event.guests) return null
  return props.event.guests.find(g => g.id === currentUserId)
})

const myRsvp = computed<'confirmed' | 'declined' | 'invited' | null>(() => {
  return (myGuestRecord.value?.pivot?.status as 'confirmed' | 'declined' | 'invited') || null
})

const isRsvping = ref(false)
const showRsvpMenu = ref(false)

function toggleRsvpMenu() {
  showRsvpMenu.value = !showRsvpMenu.value
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.rsvp-menu-wrapper')) {
    showRsvpMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

async function handleRsvp(status: 'confirmed' | 'declined' | 'invited') {
  if (isRsvping.value) return
  isRsvping.value = true
  try {
    await eventsStore.rsvp(props.event.id, status)
    showRsvpMenu.value = false
  } finally {
    isRsvping.value = false
  }
}

async function changeRsvpAndClose(status: 'confirmed' | 'declined' | 'invited') {
  await handleRsvp(status)
  showRsvpMenu.value = false
}

const eventImage = computed(() => {
  const raw = props.event.image_url || props.event.media?.[0]?.url || props.event.media?.[0]?.path || null
  return raw ? resolveMediaUrl(raw) : null
})

const formattedDate = computed(() => {
  if (!props.event.date) return ''
  const d = new Date(props.event.date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

function navigateToDetail() {
  router.push(`/events/${props.event.id}`)
}

const imageFailed = ref(false)
const showCoverCropper = ref(false)
const isUpdatingCover = ref(false)

async function handleCoverCropped(blob: Blob) {
  isUpdatingCover.value = true
  const formData = new FormData()
  formData.append('image', blob, 'event-cover.webp')
  try {
    await eventsStore.updateEvent(props.event.id, formData)
    imageFailed.value = false
  } catch (err) {
    console.error('Erro ao atualizar capa do evento', err)
  } finally {
    isUpdatingCover.value = false
  }
}

const showEditModal = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

async function confirmDeleteEvent() {
  isDeleting.value = true
  try {
    await eventsStore.deleteEvent(props.event.id)
    showDeleteModal.value = false
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="retro-event-card">
    <!-- Cover Image (Clickable to detail) -->
    <div class="event-cover" @click="navigateToDetail">
      <img
        v-if="eventImage && !imageFailed"
        :src="eventImage"
        alt="Capa do evento"
        class="cover-img"
        @error="imageFailed = true"
      />
      <div v-else class="cover-placeholder">
        <span>📅</span>
      </div>

      <!-- Action buttons for owner/admin -->
      <div v-if="isOwner" class="card-actions-group" @click.stop>
        <button
          type="button"
          class="card-action-btn cover-btn"
          @click="showCoverCropper = true"
          title="Editar foto de capa (formato retangular)"
        >
          📷 Capa
        </button>
        <button
          type="button"
          class="card-action-btn edit-btn"
          @click="showEditModal = true"
          title="Editar evento"
        >
          [✎]
        </button>
        <button
          type="button"
          class="card-action-btn delete-btn"
          @click="showDeleteModal = true"
          title="Excluir evento"
        >
          [×]
        </button>
      </div>

      <button
        v-if="isOwner"
        type="button"
        class="cover-edit-floating-btn"
        @click.stop="showCoverCropper = true"
        title="Editar capa do evento"
      >
        📷 [ Editar capa ]
      </button>
    </div>

    <!-- Event Body -->
    <div class="event-body">
      <div class="event-top-meta">
        <div class="event-date-badge">
          📅 {{ formattedDate }}
        </div>
        <div v-if="event.guests && event.guests.length" class="event-guests-tag">
          👥 {{ event.guests.length }} {{ event.guests.length === 1 ? 'convidado' : 'convidados' }}
        </div>
      </div>

      <h3 class="event-title">
        <router-link :to="'/events/' + event.id" class="event-title-link">
          {{ event.name }}
        </router-link>
      </h3>

      <div class="event-organizer">
        Organizado por: <strong>{{ event.owner?.name || 'Amigo da Casa' }}</strong>
      </div>

      <!-- RSVP Section -->
      <div class="event-rsvp-container">
        <!-- Owner badge -->
        <div v-if="isOwner" class="owner-badge-box">
          <span class="owner-pill">👑 Organizador</span>
        </div>

        <!-- Answered: Confirmed or Declined with 3-dots alteration menu -->
        <div v-else-if="myRsvp === 'confirmed' || myRsvp === 'declined'" class="rsvp-answered-bar">
          <span class="rsvp-status-pill" :class="myRsvp">
            {{ myRsvp === 'confirmed' ? '✓ Presença confirmada' : '✕ Não comparecerá' }}
          </span>

          <div class="rsvp-menu-wrapper">
            <button
              type="button"
              class="rsvp-menu-trigger"
              :class="{ 'is-open': showRsvpMenu }"
              title="Opções de confirmação"
              aria-label="Opções de confirmação"
              @click.stop="toggleRsvpMenu"
            >
              ⋮
            </button>
            <div v-if="showRsvpMenu" class="rsvp-dropdown-menu" @click.stop>
              <button
                v-if="myRsvp !== 'confirmed'"
                type="button"
                class="rsvp-dropdown-item confirm-item"
                :disabled="isRsvping"
                @click="changeRsvpAndClose('confirmed')"
              >
                <span class="item-icon">✓</span> Confirmar presença
              </button>
              <button
                v-if="myRsvp !== 'declined'"
                type="button"
                class="rsvp-dropdown-item decline-item"
                :disabled="isRsvping"
                @click="changeRsvpAndClose('declined')"
              >
                <span class="item-icon">✕</span> Não comparecer
              </button>
              <button
                type="button"
                class="rsvp-dropdown-item reset-item"
                :disabled="isRsvping"
                @click="changeRsvpAndClose('invited')"
              >
                <span class="item-icon">❓</span> Deixar em aberto
              </button>
            </div>
          </div>
        </div>

        <!-- Pending RSVP (Unanswered or invited) -->
        <div v-else class="rsvp-pending-bar">
          <button
            type="button"
            class="rsvp-action-btn rsvp-confirm"
            :disabled="isRsvping"
            @click.stop="handleRsvp('confirmed')"
            title="Confirmar que você vai ao evento"
          >
            <span class="action-symbol">✓</span> Vou
          </button>
          <button
            type="button"
            class="rsvp-action-btn rsvp-decline"
            :disabled="isRsvping"
            @click.stop="handleRsvp('declined')"
            title="Informar que não comparecerá"
          >
            <span class="action-symbol">✕</span> Não vou
          </button>
        </div>
      </div>

      <!-- Card footer linking to details -->
      <div class="card-footer">
        <router-link :to="'/events/' + event.id" class="details-link">
          Ver detalhes & feed &raquo;
        </router-link>
      </div>
    </div>

    <!-- Cover Cropper Modal -->
    <ImageCropper
      v-model="showCoverCropper"
      :aspectRatio="16 / 9"
      title="Editar Foto de Capa do Evento"
      formatNote="Formato retangular recomendado (16:9 panorâmico)"
      @cropped="handleCoverCropped"
    />

    <!-- Edit Event Modal -->
    <EventEditModal
      v-model="showEditModal"
      :event="event"
      @updated="eventsStore.fetchEvents()"
    />

    <!-- Confirm Delete Modal -->
    <RetroConfirmModal
      v-model="showDeleteModal"
      title="» Excluir Evento"
      message="Tem certeza que deseja excluir este evento?"
      details="O evento será cancelado e removido do calendário da casa."
      confirmText="Excluir"
      :loading="isDeleting"
      @confirm="confirmDeleteEvent"
    />
  </div>
</template>

<style scoped>
.retro-event-card {
  border: 2px solid var(--color-border, #D8CDC5);
  background-color: #ffffff;
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(62, 39, 35, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.retro-event-card:hover {
  border-color: var(--color-primary-400, #b8865a);
  box-shadow: 0 3px 8px rgba(62, 39, 35, 0.1);
}

.event-cover {
  position: relative;
  width: 100%;
  height: 155px;
  background-color: var(--color-primary-100);
  border-bottom: 2px solid var(--color-border);
  cursor: pointer;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.event-cover:hover .cover-img {
  transform: scale(1.02);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: linear-gradient(135deg, #d6bda2 0%, #e8d3bc 100%);
}

.card-actions-group {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.15rem 0.25rem;
  border-radius: 2px;
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  z-index: 2;
}

.card-action-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  padding: 0.15rem 0.3rem;
  letter-spacing: -0.05em;
  line-height: 1;
}

.cover-btn {
  color: var(--color-primary-800, #5f4120);
}
.cover-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-radius: 2px;
}

.edit-btn {
  color: var(--color-primary-700, #7d5628);
}
.edit-btn:hover {
  background-color: var(--color-primary-100, #fdf8f3);
  border-radius: 2px;
}

.delete-btn {
  color: var(--color-danger, #ef4444);
}
.delete-btn:hover {
  background-color: #fee2e2;
  border-radius: 2px;
}

.cover-edit-floating-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.72);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(2px);
  z-index: 2;
}
.cover-edit-floating-btn:hover {
  background-color: var(--color-primary, #a66130);
  border-color: #ffffff;
}

.event-body {
  padding: 0.85rem 1rem 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.event-top-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.event-date-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.78rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  background-color: var(--color-primary-50, #fdf8f3);
  padding: 0.2rem 0.45rem;
  border-radius: 2px;
  border: 1px solid var(--color-primary-200, #eed9c4);
}

.event-guests-tag {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: bold;
  color: var(--color-primary-700, #7d5628);
  background-color: var(--color-primary-50, #fdf8f3);
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  border: 1px solid var(--color-border, #d8cdc5);
}

.event-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.1rem;
  line-height: 1.3;
  margin: 0.15rem 0 0 0;
}

.event-title-link {
  color: var(--color-primary-900, #3E2723);
  text-decoration: none;
  transition: color 0.15s ease;
}

.event-title-link:hover {
  color: var(--color-primary, #a66130);
  text-decoration: underline;
}

.event-organizer {
  font-size: 0.8rem;
  color: var(--color-muted, #7c6858);
}

/* RSVP Section Container */
.event-rsvp-container {
  margin-top: 0.4rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--color-border, #e3d7cf);
}

.owner-badge-box {
  display: flex;
  align-items: center;
}

.owner-pill {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #fdf8f3);
  border: 1px dashed var(--color-primary-300, #dfb890);
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
}

/* Answered Bar with Badge & 3-dots Menu */
.rsvp-answered-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rsvp-status-pill {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.rsvp-status-pill.confirmed {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.rsvp-status-pill.declined {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

/* 3-dots dropdown menu */
.rsvp-menu-wrapper {
  position: relative;
}

.rsvp-menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #f7f3ee;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
  line-height: 1;
  transition: all 0.15s ease;
}

.rsvp-menu-trigger:hover,
.rsvp-menu-trigger.is-open {
  background-color: var(--color-primary-100, #faede0);
  border-color: var(--color-primary, #a66130);
  color: var(--color-primary, #a66130);
}

.rsvp-dropdown-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.15);
  padding: 0.25rem 0;
  min-width: 175px;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.rsvp-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.65rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
  width: 100%;
}

.rsvp-dropdown-item:hover:not(:disabled) {
  background-color: var(--color-primary-50, #fdf8f3);
}

.rsvp-dropdown-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.confirm-item {
  color: #15803d;
}

.decline-item {
  color: #b91c1c;
}

.reset-item {
  color: var(--color-muted, #7c6858);
}

.item-icon {
  font-weight: bold;
  font-size: 0.85rem;
}

/* Pending Bar (Clean, quick single-click buttons) */
.rsvp-pending-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rsvp-action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.32rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rsvp-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rsvp-confirm {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: 1px solid var(--color-primary-800, #5f4120);
}
.rsvp-confirm:hover:not(:disabled) {
  background-color: var(--color-primary-600, #884d23);
}

.rsvp-decline {
  background-color: #ffffff;
  color: var(--color-muted, #7c6858);
  border: 1px solid var(--color-border, #d8cdc5);
}
.rsvp-decline:hover:not(:disabled) {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.action-symbol {
  font-weight: bold;
}

/* Card footer */
.card-footer {
  margin-top: auto;
  padding-top: 0.4rem;
  display: flex;
  justify-content: flex-end;
}

.details-link {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  text-decoration: none;
  transition: all 0.15s ease;
}

.details-link:hover {
  text-decoration: underline;
  color: var(--color-primary-800, #5f4120);
}
</style>
