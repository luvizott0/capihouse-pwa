import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Event } from '@/types/models'
import * as eventsApi from '@/api/events'

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const upcomingEvents = ref<Event[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)

  const activeFilters = ref<{ search?: string; date?: string; userId?: number }>({})

  async function fetchEvents(
    page = 1,
    options?: { search?: string; date?: string; userId?: number }
  ) {
    isLoading.value = true
    if (options) {
      activeFilters.value = {
        search: options.search || undefined,
        date: options.date || undefined,
        userId: options.userId || undefined,
      }
    } else {
      activeFilters.value = {}
    }
    try {
      const res = await eventsApi.getEvents({
        page,
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        userId: activeFilters.value.userId,
      })
      events.value = res.data.data
    } finally {
      isLoading.value = false
    }
  }

  function clearFilters() {
    activeFilters.value = {}
  }

  async function fetchUpcoming() {
    try {
      const res = await eventsApi.getUpcomingEvents()
      upcomingEvents.value = res.data
    } catch {
      // Ignore
    }
  }

  async function createEvent(formData: FormData) {
    isSubmitting.value = true
    try {
      const res = await eventsApi.createEvent(formData)
      events.value.unshift(res.data)
      fetchUpcoming()
      return res.data
    } finally {
      isSubmitting.value = false
    }
  }

  async function rsvp(eventId: number, status: 'confirmed' | 'declined' | 'invited') {
    await eventsApi.rsvpEvent(eventId, status)
    fetchEvents()
  }

  async function deleteEvent(eventId: number) {
    await eventsApi.deleteEvent(eventId)
    events.value = events.value.filter(e => e.id !== eventId)
    upcomingEvents.value = upcomingEvents.value.filter(e => e.id !== eventId)
  }

  async function updateEvent(eventId: number, formData: FormData) {
    isSubmitting.value = true
    try {
      const res = await eventsApi.updateEvent(eventId, formData)
      const index = events.value.findIndex(e => e.id === eventId)
      if (index !== -1) {
        events.value[index] = res.data
      }
      fetchUpcoming()
      return res.data
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    events,
    upcomingEvents,
    activeFilters,
    clearFilters,
    isLoading,
    isSubmitting,
    fetchEvents,
    fetchUpcoming,
    createEvent,
    updateEvent,
    rsvp,
    deleteEvent,
  }
})
