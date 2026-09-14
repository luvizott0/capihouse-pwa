<script setup lang="ts">
import { onMounted } from 'vue'
import { useEventsStore } from '@/stores/events'

const eventsStore = useEventsStore()

onMounted(() => {
  eventsStore.fetchUpcoming()
})
</script>

<template>
  <div class="retro-card">
    <div class="retro-card-header">
      » Próximos Eventos
    </div>
    <div class="sidebar-events-body">
      <div v-if="eventsStore.upcomingEvents.length" class="events-mini-list">
        <router-link
          v-for="ev in eventsStore.upcomingEvents"
          :key="ev.id"
          to="/events"
          class="event-mini-item"
        >
          <div class="event-mini-date">
            <span class="day">{{ new Date(ev.date).getDate() }}</span>
            <span class="month">{{ new Date(ev.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') }}</span>
          </div>
          <div class="event-mini-info">
            <div class="event-mini-name">{{ ev.name }}</div>
            <div class="event-mini-time">
              {{ new Date(ev.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
            </div>
          </div>
        </router-link>
      </div>
      <div v-else class="empty-mini">
        Nenhum evento próximo.
      </div>
      <div class="sidebar-footer">
        <router-link to="/events" class="view-all-link">
          Ver todos os eventos &raquo;
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-events-body {
  padding: 0.75rem;
  background-color: #ffffff;
}

.events-mini-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.event-mini-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  text-decoration: none;
  background-color: var(--color-primary-50);
  transition: all 0.15s ease;
}
.event-mini-item:hover {
  background-color: var(--color-primary-100);
  border-color: var(--color-primary-400);
  text-decoration: none;
}

.event-mini-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary);
  color: white;
  min-width: 38px;
  height: 38px;
  border-radius: 2px;
  font-family: var(--font-heading);
  line-height: 1;
}
.event-mini-date .day {
  font-size: 0.85rem;
  font-weight: bold;
}
.event-mini-date .month {
  font-size: 0.65rem;
  text-transform: uppercase;
}

.event-mini-info {
  flex: 1;
  min-width: 0;
}
.event-mini-name {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--color-primary-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.event-mini-time {
  font-size: 0.7rem;
  color: var(--color-muted);
}

.empty-mini {
  font-size: 0.8rem;
  color: var(--color-muted);
  text-align: center;
  padding: 0.75rem 0;
}

.sidebar-footer {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-primary-100);
  text-align: center;
}
.view-all-link {
  font-size: 0.75rem;
  font-family: var(--font-heading);
  font-weight: bold;
  color: var(--color-primary);
  text-decoration: none;
}
.view-all-link:hover {
  text-decoration: underline;
}
</style>
