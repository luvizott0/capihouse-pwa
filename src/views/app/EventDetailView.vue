<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feed'
import { useEventsStore } from '@/stores/events'
import * as eventsApi from '@/api/events'
import type { Event, EventGuest } from '@/types/models'
import axios from 'axios'

import UserAvatar from '@/components/ui/UserAvatar.vue'
import RetroConfirmModal from '@/components/ui/RetroConfirmModal.vue'
import PostCard from '@/components/feed/PostCard.vue'
import PostCardSkeleton from '@/components/feed/PostCardSkeleton.vue'
import PostCreateModal from '@/components/feed/PostCreateModal.vue'
import EventEditModal from '@/components/events/EventEditModal.vue'
import EventInviteModal from '@/components/events/EventInviteModal.vue'
import ImageCropper from '@/components/profile/ImageCropper.vue'
import { resolveMediaUrl } from '@/utils/media'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const eventsStore = useEventsStore()

const eventId = Number(route.params.id)
const event = ref<Event | null>(null)
const isLoadingEvent = ref(true)
const eventError = ref('')

// Tabs: 'posts' | 'guests'
const activeTab = ref<'posts' | 'guests'>('posts')

// Guest filter: 'all' | 'confirmed' | 'declined' | 'invited'
const guestFilter = ref<'all' | 'confirmed' | 'declined' | 'invited'>('all')

// Modals
const showCreatePostModal = ref(false)
const showEditEventModal = ref(false)
const showDeleteEventModal = ref(false)
const showInviteModal = ref(false)
const showCoverCropper = ref(false)
const isDeletingEvent = ref(false)
const isRsvping = ref(false)
const showRsvpMenu = ref(false)
const imageFailed = ref(false)

const isOwner = computed(() => {
  if (!event.value) return false
  return authStore.user?.id === event.value.user_id || authStore.isAdmin
})

const myGuestRecord = computed(() => {
  const currentUserId = authStore.user?.id
  if (!currentUserId || !event.value?.guests) return null
  return event.value.guests.find(g => g.id === currentUserId)
})

const myRsvp = computed<'confirmed' | 'declined' | 'invited' | null>(() => {
  return (myGuestRecord.value?.pivot?.status as 'confirmed' | 'declined' | 'invited') || null
})

const eventImage = computed(() => {
  if (!event.value) return null
  const raw = event.value.image_url || event.value.media?.[0]?.url || event.value.media?.[0]?.path || null
  return raw ? resolveMediaUrl(raw) : null
})

const formattedDate = computed(() => {
  if (!event.value?.date) return ''
  const d = new Date(event.value.date)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

// Guest counts
const confirmedGuests = computed(() => {
  return event.value?.guests?.filter(g => g.pivot?.status === 'confirmed') || []
})

const declinedGuests = computed(() => {
  return event.value?.guests?.filter(g => g.pivot?.status === 'declined') || []
})

const pendingGuests = computed(() => {
  return event.value?.guests?.filter(g => !g.pivot?.status || g.pivot?.status === 'invited') || []
})

const filteredGuests = computed<EventGuest[]>(() => {
  if (!event.value?.guests) return []
  if (guestFilter.value === 'confirmed') return confirmedGuests.value
  if (guestFilter.value === 'declined') return declinedGuests.value
  if (guestFilter.value === 'invited') return pendingGuests.value
  return event.value.guests
})

async function loadEventData() {
  isLoadingEvent.value = true
  eventError.value = ''
  try {
    const res = await eventsApi.getEvent(eventId)
    event.value = res.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 403) {
        eventError.value = 'Este evento é exclusivo para convidados da casa.'
      } else if (err.response?.status === 404) {
        eventError.value = 'Evento não encontrado.'
      } else {
        eventError.value = 'Erro ao carregar detalhes do evento.'
      }
    } else {
      eventError.value = 'Erro ao carregar detalhes do evento.'
    }
  } finally {
    isLoadingEvent.value = false
  }
}

async function loadEventPosts() {
  await feedStore.fetchPosts(1, {
    eventId,
    forceRefresh: true,
  })
}

async function handleRsvp(status: 'confirmed' | 'declined' | 'invited') {
  if (isRsvping.value || !event.value) return
  isRsvping.value = true
  try {
    const res = await eventsStore.rsvp(event.value.id, status)
    if (res?.event) {
      event.value = res.event
    } else {
      await loadEventData()
    }
    showRsvpMenu.value = false
  } finally {
    isRsvping.value = false
  }
}

async function handleCoverCropped(blob: Blob) {
  if (!event.value) return
  const formData = new FormData()
  formData.append('image', blob, 'event-cover.webp')
  try {
    const updated = await eventsStore.updateEvent(event.value.id, formData)
    event.value = updated
    imageFailed.value = false
  } catch (err) {
    console.error('Erro ao atualizar capa do evento', err)
  }
}

async function confirmDeleteEvent() {
  if (!event.value) return
  isDeletingEvent.value = true
  try {
    await eventsStore.deleteEvent(event.value.id)
    showDeleteEventModal.value = false
    router.push('/events')
  } finally {
    isDeletingEvent.value = false
  }
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target && !target.closest('.rsvp-menu-wrapper')) {
    showRsvpMenu.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await loadEventData()
  if (event.value) {
    await loadEventPosts()
    if (authStore.user) {
      feedStore.subscribeToFeed(authStore.user.id, undefined, eventId)
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  feedStore.unsubscribeFromFeed(undefined, eventId)
  feedStore.activeEventId = undefined
})
</script>

<template>
  <div class="event-detail-container">
    <!-- Header Navigation -->
    <div class="detail-nav-header">
      <router-link to="/events" class="back-link">
        &laquo; Voltar para Eventos
      </router-link>
      <div v-if="event && isOwner" class="header-owner-actions">
        <button
          type="button"
          class="owner-btn"
          @click="showInviteModal = true"
          title="Convidar mais amigos da casa"
        >
          👥 [ + Convidar ]
        </button>
        <button
          type="button"
          class="owner-btn"
          @click="showEditEventModal = true"
          title="Editar dados do evento"
        >
          ✎ [ Editar ]
        </button>
        <button
          type="button"
          class="owner-btn delete"
          @click="showDeleteEventModal = true"
          title="Excluir evento"
        >
          × [ Excluir ]
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="eventError" class="error-card">
      <div class="error-icon">🔒</div>
      <h3 class="error-title">Acesso Restrito</h3>
      <p class="error-message">{{ eventError }}</p>
      <router-link to="/events" class="retro-btn-link">
        [ Voltar aos Eventos ]
      </router-link>
    </div>

    <!-- Loading Event Skeleton -->
    <div v-else-if="isLoadingEvent" class="loading-box">
      <span class="loading-spin">📅</span>
      <span>Carregando detalhes do evento...</span>
    </div>

    <!-- Event Detail Content -->
    <div v-else-if="event" class="event-main-content">
      <!-- Panoramic Banner Cover -->
      <div class="banner-cover-box">
        <img
          v-if="eventImage && !imageFailed"
          :src="eventImage"
          alt="Capa do evento"
          class="banner-img"
          @error="imageFailed = true"
        />
        <div v-else class="banner-placeholder">
          <span>📅</span>
        </div>

        <button
          v-if="isOwner"
          type="button"
          class="banner-edit-btn"
          @click="showCoverCropper = true"
          title="Editar foto de capa (16:9 panorâmico)"
        >
          📷 [ Alterar foto de capa ]
        </button>
      </div>

      <!-- Event Header Info Card -->
      <div class="event-info-card">
        <div class="info-top-row">
          <div class="event-date-tag">
            📅 {{ formattedDate }}
          </div>
          <div class="event-attendees-summary">
            👥 {{ event.guests?.length || 0 }} {{ (event.guests?.length === 1) ? 'convidado' : 'convidados' }}
          </div>
        </div>

        <h1 class="event-name">{{ event.name }}</h1>

        <div class="event-organizer-row">
          <span class="organizer-label">Organizado por:</span>
          <router-link
            v-if="event.owner?.username"
            :to="'/profile/' + event.owner.username"
            class="organizer-profile-link"
          >
            <UserAvatar :user="event.owner" size="sm" />
            <span class="organizer-name">{{ event.owner.name }}</span>
            <span class="organizer-handle">(@{{ event.owner.username }})</span>
          </router-link>
        </div>

        <!-- Event Description -->
        <div class="event-desc-box">
          <h4 class="desc-heading">» Descrição do Evento</h4>
          <p class="desc-content">{{ event.description }}</p>
        </div>

        <!-- RSVP Action Bar inside details -->
        <div class="detail-rsvp-bar">
          <div v-if="isOwner" class="owner-notice">
            <span>👑 Você é o organizador deste evento.</span>
          </div>

          <div v-else class="guest-rsvp-box">
            <span class="rsvp-title">Sua presença:</span>

            <!-- If already confirmed or declined: show badge + 3-dots alteration menu -->
            <div v-if="myRsvp === 'confirmed' || myRsvp === 'declined'" class="rsvp-status-group">
              <span class="rsvp-badge" :class="myRsvp">
                {{ myRsvp === 'confirmed' ? '✓ Presença confirmada!' : '✕ Você marcou que não vai' }}
              </span>

              <div class="rsvp-menu-wrapper">
                <button
                  type="button"
                  class="rsvp-menu-btn"
                  :class="{ 'is-open': showRsvpMenu }"
                  @click.stop="showRsvpMenu = !showRsvpMenu"
                  title="Alterar confirmação"
                >
                  ⋮ Opções
                </button>
                <div v-if="showRsvpMenu" class="rsvp-dropdown-menu" @click.stop>
                  <button
                    v-if="myRsvp !== 'confirmed'"
                    type="button"
                    class="rsvp-dropdown-item confirm-item"
                    :disabled="isRsvping"
                    @click="handleRsvp('confirmed')"
                  >
                    <span class="item-icon">✓</span> Confirmar presença
                  </button>
                  <button
                    v-if="myRsvp !== 'declined'"
                    type="button"
                    class="rsvp-dropdown-item decline-item"
                    :disabled="isRsvping"
                    @click="handleRsvp('declined')"
                  >
                    <span class="item-icon">✕</span> Não comparecer
                  </button>
                  <button
                    type="button"
                    class="rsvp-dropdown-item reset-item"
                    :disabled="isRsvping"
                    @click="handleRsvp('invited')"
                  >
                    <span class="item-icon">❓</span> Deixar em aberto
                  </button>
                </div>
              </div>
            </div>

            <!-- If pending: direct action buttons -->
            <div v-else class="rsvp-buttons-group">
              <button
                type="button"
                class="detail-rsvp-btn confirm"
                :disabled="isRsvping"
                @click="handleRsvp('confirmed')"
              >
                ✓ Confirmar presença
              </button>
              <button
                type="button"
                class="detail-rsvp-btn decline"
                :disabled="isRsvping"
                @click="handleRsvp('declined')"
              >
                ✕ Não poderei ir
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs: Feed do Evento & Lista de Convidados -->
      <div class="event-tabs-bar">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'posts' }"
          @click="activeTab = 'posts'"
        >
          💬 Publicações do Evento
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'guests' }"
          @click="activeTab = 'guests'"
        >
          👥 Convidados ({{ event.guests?.length || 0 }})
        </button>
      </div>

      <!-- TAB 1: Event Posts Feed -->
      <div v-if="activeTab === 'posts'" class="tab-pane feed-pane">
        <div class="feed-top-actions">
          <div class="feed-notice">
            🔒 Feed exclusivo do evento. Apenas convidados e o organizador podem visualizar e interagir.
          </div>
          <button
            type="button"
            class="create-post-btn"
            @click="showCreatePostModal = true"
          >
            [ + Nova Publicação no Evento ]
          </button>
        </div>

        <!-- Posts List -->
        <div v-if="feedStore.isLoading && feedStore.posts.length === 0" class="posts-loading">
          <PostCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="feedStore.posts.length" class="posts-stream">
          <PostCard
            v-for="post in feedStore.posts"
            :key="post.id"
            :post="post"
            @deleted="feedStore.deletePost(post.id)"
          />
        </div>

        <!-- Empty State for Event Posts -->
        <div v-else class="empty-feed-card">
          <span class="empty-icon">📝</span>
          <h4 class="empty-title">Nenhuma publicação no evento ainda</h4>
          <p class="empty-text">
            Seja o primeiro a postar! Compartilhe fotos, combine detalhes ou deixe um recado para quem vai comparecer.
          </p>
          <button
            type="button"
            class="empty-create-btn"
            @click="showCreatePostModal = true"
          >
            [ Criar primeira publicação ]
          </button>
        </div>
      </div>

      <!-- TAB 2: Guest List -->
      <div v-else-if="activeTab === 'guests'" class="tab-pane guests-pane">
        <!-- Guest Summary Metrics -->
        <div class="guest-metrics-row">
          <div class="metric-card total">
            <span class="metric-val">{{ event.guests?.length || 0 }}</span>
            <span class="metric-lbl">Total Convidados</span>
          </div>
          <div class="metric-card confirmed">
            <span class="metric-val">{{ confirmedGuests.length }}</span>
            <span class="metric-lbl">Confirmados</span>
          </div>
          <div class="metric-card declined">
            <span class="metric-val">{{ declinedGuests.length }}</span>
            <span class="metric-lbl">Não vão</span>
          </div>
          <div class="metric-card pending">
            <span class="metric-val">{{ pendingGuests.length }}</span>
            <span class="metric-lbl">Aguardando</span>
          </div>
        </div>

        <!-- Filter Chips & Add button -->
        <div class="guests-filter-bar">
          <div class="filter-chips">
            <button
              type="button"
              class="chip-btn"
              :class="{ active: guestFilter === 'all' }"
              @click="guestFilter = 'all'"
            >
              Todos ({{ event.guests?.length || 0 }})
            </button>
            <button
              type="button"
              class="chip-btn"
              :class="{ active: guestFilter === 'confirmed' }"
              @click="guestFilter = 'confirmed'"
            >
              ✓ Confirmados ({{ confirmedGuests.length }})
            </button>
            <button
              type="button"
              class="chip-btn"
              :class="{ active: guestFilter === 'declined' }"
              @click="guestFilter = 'declined'"
            >
              ✕ Não vão ({{ declinedGuests.length }})
            </button>
            <button
              type="button"
              class="chip-btn"
              :class="{ active: guestFilter === 'invited' }"
              @click="guestFilter = 'invited'"
            >
              ⏳ Aguardando ({{ pendingGuests.length }})
            </button>
          </div>

          <button
            v-if="isOwner"
            type="button"
            class="invite-guest-btn"
            @click="showInviteModal = true"
          >
            [ + Convidar Amigos ]
          </button>
        </div>

        <!-- Guests Grid -->
        <div v-if="filteredGuests.length" class="guests-grid">
          <div
            v-for="guest in filteredGuests"
            :key="guest.id"
            class="guest-card"
          >
            <router-link :to="'/profile/' + guest.username" class="guest-avatar-link">
              <UserAvatar :user="guest" size="md" />
            </router-link>

            <div class="guest-details">
              <router-link :to="'/profile/' + guest.username" class="guest-name">
                {{ guest.name }}
              </router-link>
              <span class="guest-username">@{{ guest.username }}</span>
            </div>

            <div class="guest-status-wrapper">
              <span
                v-if="guest.pivot?.status === 'confirmed'"
                class="guest-status-tag confirmed"
              >
                ✓ Confirmado
              </span>
              <span
                v-else-if="guest.pivot?.status === 'declined'"
                class="guest-status-tag declined"
              >
                ✕ Não vai
              </span>
              <span
                v-else
                class="guest-status-tag pending"
              >
                ⏳ Aguardando
              </span>
            </div>
          </div>
        </div>

        <div v-else class="empty-guests-box">
          Nenhum convidado encontrado nesta categoria.
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Create Post Modal for this Event -->
    <PostCreateModal
      v-if="event"
      v-model="showCreatePostModal"
      :eventId="event.id"
      :eventName="event.name"
      @created="loadEventPosts"
    />

    <!-- Invite Friends Modal -->
    <EventInviteModal
      v-if="event"
      v-model="showInviteModal"
      :event="event"
      @invited="loadEventData"
    />

    <!-- Edit Event Modal -->
    <EventEditModal
      v-if="event"
      v-model="showEditEventModal"
      :event="event"
      @updated="loadEventData"
    />

    <!-- Cover Cropper Modal -->
    <ImageCropper
      v-model="showCoverCropper"
      :aspectRatio="16 / 9"
      title="Editar Foto de Capa do Evento"
      formatNote="Formato retangular recomendado (16:9 panorâmico)"
      @cropped="handleCoverCropped"
    />

    <!-- Confirm Delete Modal -->
    <RetroConfirmModal
      v-model="showDeleteEventModal"
      title="» Excluir Evento"
      message="Tem certeza que deseja cancelar e excluir este evento?"
      details="Todas as publicações e convites vinculados ao evento serão removidos permanentemente."
      confirmText="Excluir Evento"
      :loading="isDeletingEvent"
      @confirm="confirmDeleteEvent"
    />
  </div>
</template>

<style scoped>
.event-detail-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Nav Header */
.detail-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-primary-50, #fdf8f3);
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.back-link {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  text-decoration: none;
  transition: color 0.15s ease;
}
.back-link:hover {
  text-decoration: underline;
  color: var(--color-primary-800, #5f4120);
}

.header-owner-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.owner-btn {
  background: none;
  border: 1px solid var(--color-border, #d8cdc5);
  background-color: #ffffff;
  padding: 0.25rem 0.5rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.owner-btn:hover {
  background-color: var(--color-primary-100, #faede0);
  border-color: var(--color-primary, #a66130);
}

.owner-btn.delete {
  color: #dc2626;
  border-color: #fca5a5;
}
.owner-btn.delete:hover {
  background-color: #fee2e2;
  border-color: #ef4444;
}

/* Error Card */
.error-card {
  background-color: #ffffff;
  border: 1px dashed #ef4444;
  border-radius: 2px;
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  font-size: 3rem;
}

.error-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.25rem;
  color: #b91c1c;
  margin: 0;
}

.error-message {
  font-size: 0.9rem;
  color: var(--color-muted, #7c6858);
  max-width: 400px;
}

.retro-btn-link {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffffff;
  background-color: var(--color-primary, #a66130);
  padding: 0.4rem 0.8rem;
  border-radius: 2px;
  text-decoration: none;
  margin-top: 0.5rem;
}

/* Loading Box */
.loading-box {
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 3rem 1rem;
  text-align: center;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.9rem;
  color: var(--color-muted, #7c6858);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spin {
  font-size: 1.5rem;
}

/* Banner Cover */
.banner-cover-box {
  position: relative;
  width: 100%;
  height: 240px;
  background-color: var(--color-primary-100, #faede0);
  border: 2px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  overflow: hidden;
}

.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4.5rem;
  background: linear-gradient(135deg, #d6bda2 0%, #e8d3bc 100%);
}

.banner-edit-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.75);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.35rem 0.65rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(2px);
}
.banner-edit-btn:hover {
  background-color: var(--color-primary, #a66130);
  border-color: #ffffff;
}

/* Event Info Card */
.event-info-card {
  background-color: #ffffff;
  border: 2px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.info-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-date-tag {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-primary, #a66130);
  background-color: var(--color-primary-50, #fdf8f3);
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  border: 1px solid var(--color-primary-200, #eed9c4);
}

.event-attendees-summary {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-primary-700, #7d5628);
  background-color: var(--color-primary-50, #fdf8f3);
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
  border: 1px solid var(--color-border, #d8cdc5);
}

.event-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.45rem;
  color: var(--color-primary-900, #3E2723);
  margin: 0;
}

.event-organizer-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-muted, #7c6858);
}

.organizer-profile-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
  color: inherit;
}
.organizer-profile-link:hover .organizer-name {
  color: var(--color-primary, #a66130);
  text-decoration: underline;
}

.organizer-name {
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.organizer-handle {
  font-size: 0.78rem;
  color: var(--color-muted, #7c6858);
}

/* Event Description Box */
.event-desc-box {
  background-color: #faf7f3;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.85rem 1rem;
}

.desc-heading {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  margin: 0 0 0.4rem 0;
  text-transform: uppercase;
}

.desc-content {
  font-size: 0.92rem;
  line-height: 1.5;
  color: #333333;
  margin: 0;
  white-space: pre-wrap;
}

/* RSVP Bar inside details */
.detail-rsvp-bar {
  margin-top: 0.35rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border, #d8cdc5);
}

.owner-notice {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
  background-color: var(--color-primary-50, #fdf8f3);
  padding: 0.4rem 0.8rem;
  border-radius: 2px;
  border: 1px dashed var(--color-primary-300, #dfb890);
  text-align: center;
}

.guest-rsvp-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.rsvp-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-primary-800, #5f4120);
}

.rsvp-status-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rsvp-badge {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.3rem 0.65rem;
  border-radius: 2px;
}
.rsvp-badge.confirmed {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}
.rsvp-badge.declined {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.rsvp-menu-wrapper {
  position: relative;
}

.rsvp-menu-btn {
  background-color: #f7f3ee;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-primary-800, #5f4120);
  padding: 0.3rem 0.55rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.rsvp-menu-btn:hover,
.rsvp-menu-btn.is-open {
  background-color: var(--color-primary-100, #faede0);
  border-color: var(--color-primary, #a66130);
}

.rsvp-dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.15);
  padding: 0.25rem 0;
  min-width: 180px;
  z-index: 30;
  display: flex;
  flex-direction: column;
}

.rsvp-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.75rem;
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
}

.rsvp-buttons-group {
  display: flex;
  gap: 0.5rem;
}

.detail-rsvp-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.detail-rsvp-btn.confirm {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: 1px solid var(--color-primary-800, #5f4120);
}
.detail-rsvp-btn.confirm:hover:not(:disabled) {
  background-color: var(--color-primary-600, #884d23);
}

.detail-rsvp-btn.decline {
  background-color: #ffffff;
  color: var(--color-muted, #7c6858);
  border: 1px solid var(--color-border, #d8cdc5);
}
.detail-rsvp-btn.decline:hover:not(:disabled) {
  background-color: #fee2e2;
  color: #b91c1c;
  border-color: #fca5a5;
}

/* Tabs Bar */
.event-tabs-bar {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--color-primary, #a66130);
}

.tab-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-muted, #7c6858);
  background-color: #f7f3ee;
  border: 1px solid var(--color-border, #d8cdc5);
  border-bottom: none;
  padding: 0.5rem 1rem;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  background-color: var(--color-primary-100, #faede0);
  color: var(--color-primary-800, #5f4120);
}
.tab-btn.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary, #a66130);
}

/* Tab Panes */
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Feed Pane */
.feed-top-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: var(--color-primary-50, #fdf8f3);
  border: 1px dashed var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.65rem 0.85rem;
}

.feed-notice {
  font-size: 0.8rem;
  font-family: var(--font-heading, 'Space Mono', monospace);
  color: var(--color-primary-800, #5f4120);
  font-weight: 600;
}

.create-post-btn {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: 1px solid var(--color-primary-800, #5f4120);
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.create-post-btn:hover {
  background-color: var(--color-primary-600, #884d23);
}

.posts-stream {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-feed-card {
  background-color: #ffffff;
  border: 1px dashed var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2.5rem;
}

.empty-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.1rem;
  color: var(--color-primary-800, #5f4120);
  margin: 0;
}

.empty-text {
  font-size: 0.85rem;
  color: var(--color-muted, #7c6858);
  max-width: 420px;
  margin: 0;
}

.empty-create-btn {
  margin-top: 0.5rem;
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.45rem 0.9rem;
  border-radius: 2px;
  cursor: pointer;
}

/* Guests Pane */
.guest-metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
}

.metric-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.metric-val {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.4rem;
  font-weight: bold;
}

.metric-lbl {
  font-size: 0.75rem;
  color: var(--color-muted, #7c6858);
}

.metric-card.confirmed .metric-val {
  color: #15803d;
}
.metric-card.declined .metric-val {
  color: #b91c1c;
}
.metric-card.pending .metric-val {
  color: var(--color-primary, #a66130);
}

.guests-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  background-color: #f7f3ee;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  color: var(--color-primary-800, #5f4120);
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip-btn:hover {
  background-color: var(--color-primary-100, #faede0);
}
.chip-btn.active {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border-color: var(--color-primary, #a66130);
}

.invite-guest-btn {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  background-color: var(--color-primary-50, #fdf8f3);
  border: 1px solid var(--color-primary, #a66130);
  border-radius: 2px;
  color: var(--color-primary, #a66130);
  cursor: pointer;
  transition: all 0.15s ease;
}
.invite-guest-btn:hover {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
}

.guests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.guest-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 0.65rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  box-shadow: 0 1px 2px rgba(62, 39, 35, 0.04);
}

.guest-avatar-link {
  flex-shrink: 0;
  text-decoration: none;
}

.guest-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.guest-name {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary-900, #3E2723);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.guest-name:hover {
  text-decoration: underline;
  color: var(--color-primary, #a66130);
}

.guest-username {
  font-size: 0.75rem;
  color: var(--color-muted, #7c6858);
}

.guest-status-tag {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.45rem;
  border-radius: 2px;
  white-space: nowrap;
}

.guest-status-tag.confirmed {
  background-color: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.guest-status-tag.declined {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
}

.guest-status-tag.pending {
  background-color: #f7f3ee;
  color: var(--color-muted, #7c6858);
  border: 1px dashed var(--color-border, #d8cdc5);
}

.empty-guests-box {
  background-color: #ffffff;
  border: 1px dashed var(--color-border, #d8cdc5);
  border-radius: 2px;
  padding: 2rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-muted, #7c6858);
}
</style>
