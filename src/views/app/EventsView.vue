<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEventsStore } from '@/stores/events'
import EventCard from '@/components/events/EventCard.vue'
import EventCreateModal from '@/components/events/EventCreateModal.vue'

const eventsStore = useEventsStore()
const showCreateModal = ref(false)

onMounted(() => {
  eventsStore.fetchEvents()
})
</script>

<template>
  <div class="events-view-container">
    <!-- Header with Action -->
    <div class="events-header">
      <div>
        <h2 class="section-title">» Eventos da Casa</h2>
        <p class="section-subtitle">Encontros, churrascos e comemorações dos amigos.</p>
      </div>
      <button type="button" class="btn-create-event" @click="showCreateModal = true">
        [ + Novo Evento ]
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="eventsStore.isLoading && eventsStore.events.length === 0" class="loading-state">
      Carregando eventos...
    </div>

    <!-- Events Grid -->
    <div v-else-if="eventsStore.events.length" class="events-grid">
      <EventCard
        v-for="event in eventsStore.events"
        :key="event.id"
        :event="event"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-events-card">
      <div class="empty-icon">📅</div>
      <h3 class="empty-title">Nenhum evento agendado</h3>
      <p class="empty-subtitle">Que tal marcar um café ou um rolê com a galera?</p>
      <button type="button" class="empty-create-btn" @click="showCreateModal = true">
        [ Criar primeiro evento ]
      </button>
    </div>

    <!-- Create Event Modal -->
    <EventCreateModal
      v-model="showCreateModal"
      @created="eventsStore.fetchEvents(1)"
    />
  </div>
</template>

<style scoped>
.events-view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-title {
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 1.2rem;
  color: var(--color-primary-800, #5f4120);
  margin: 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted, #847062);
  margin-top: 0.2rem;
}

.btn-create-event {
  background-color: var(--color-primary, #a66130);
  color: #ffffff;
  border: none;
  font-family: var(--font-heading, 'Space Mono', monospace);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.btn-create-event:hover {
  background-color: var(--color-primary-600, #9a6a32);
}

.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  font-family: var(--font-heading);
  color: var(--color-muted);
}

.empty-events-card {
  background: #ffffff;
  border: 2px solid var(--color-border);
  border-radius: 2px;
  padding: 2.5rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 3rem;
}

.empty-title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--color-primary-800);
}

.empty-subtitle {
  font-size: 0.85rem;
  color: var(--color-muted);
}

.empty-create-btn {
  margin-top: 0.75rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 2px;
  cursor: pointer;
}
</style>
