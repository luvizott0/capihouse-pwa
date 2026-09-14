<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Event } from '@/types/models'
import { useEventsStore } from '@/stores/events'
import { useAuthStore } from '@/stores/auth'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import EventEditModal from '@/components/events/EventEditModal.vue'
import { resolveMediaUrl } from '@/utils/media'

const props = defineProps<{ event: Event }>()

const eventsStore = useEventsStore()
const authStore = useAuthStore()

const isOwner = computed(() => {
  return authStore.user?.id === props.event.user_id || authStore.isAdmin
})

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

async function handleRsvp(status: 'confirmed' | 'declined') {
  await eventsStore.rsvp(props.event.id, status)
}

const imageFailed = ref(false)

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
    <!-- Cover Image -->
    <div class="event-cover">
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
      <div v-if="isOwner" class="card-actions-group">
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
    </div>

    <!-- Event Body -->
    <div class="event-body">
      <div class="event-date-badge">
        📅 {{ formattedDate }}
      </div>

      <h3 class="event-title">{{ event.name }}</h3>

      <div class="event-organizer">
        Organizado por: <strong>{{ event.owner?.name || 'Amigo da Casa' }}</strong>
      </div>

      <div v-if="event.guests && event.guests.length" class="event-guests-tag">
        👥 Convidou {{ event.guests.length }} {{ event.guests.length === 1 ? 'amigo' : 'amigos' }}
      </div>

      <p class="event-desc">{{ event.description }}</p>

      <!-- RSVP Actions: Hidden for owner, shown for guests/others -->
      <div v-if="!isOwner" class="rsvp-row">
        <span class="rsvp-label">Sua presença:</span>
        <div class="rsvp-buttons">
          <button type="button" class="rsvp-btn rsvp-confirm" @click="handleRsvp('confirmed')">
            [ Vou ]
          </button>
          <button type="button" class="rsvp-btn rsvp-decline" @click="handleRsvp('declined')">
            [ Não vou ]
          </button>
        </div>
      </div>
      <div v-else class="rsvp-row owner-row">
        <span class="owner-status-badge">👑 Você é o organizador deste evento</span>
      </div>
    </div>

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
}

.event-cover {
  position: relative;
  width: 100%;
  height: 160px;
  background-color: var(--color-primary-100);
  border-bottom: 2px solid var(--color-border);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  background: rgba(255, 255, 255, 0.92);
  padding: 0.15rem 0.25rem;
  border-radius: 2px;
  border: 1px solid var(--color-border);
}

.card-action-btn {
  background: none;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
  padding: 0.15rem 0.25rem;
  letter-spacing: -0.05em;
  line-height: 1;
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

.event-guests-tag {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-primary);
  background-color: var(--color-primary-50);
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
  width: fit-content;
  border: 1px solid var(--color-primary-200);
}

.owner-row {
  justify-content: center;
}

.owner-status-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  background-color: var(--color-primary-50);
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  border: 1px dashed var(--color-primary-300);
  text-align: center;
  width: 100%;
}

.event-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-date-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary, #a66130);
  background-color: var(--color-primary-50);
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  width: fit-content;
}

.event-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.15rem;
  color: var(--color-primary-800, #5f4120);
  margin-top: 0.25rem;
}

.event-organizer {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.event-desc {
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333333;
  margin-top: 0.25rem;
  white-space: pre-wrap;
}

.rsvp-row {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-primary-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rsvp-label {
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  font-family: var(--font-heading);
}

.rsvp-buttons {
  display: flex;
  gap: 0.5rem;
}

.rsvp-btn {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.25rem 0.6rem;
  border-radius: 2px;
  cursor: pointer;
}

.rsvp-confirm {
  background-color: var(--color-primary);
  color: white;
  border: none;
}
.rsvp-confirm:hover {
  background-color: var(--color-primary-600);
}

.rsvp-decline {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
}
.rsvp-decline:hover {
  background-color: #fee2e2;
  color: #dc2626;
}
</style>
