import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Event } from '@/types/models'
import * as eventsApi from '@/api/events'

export const useEventsStore = defineStore('events', () => {
  const events = ref<Event[]>([])
  const upcomingEvents = ref<Event[]>([])
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const isSubmitting = ref(false)
  const hasLoaded = ref(false)
  const currentPage = ref(1)
  const lastPage = ref(1)

  const hasMorePages = computed(() => currentPage.value < lastPage.value)

  const activeFilters = ref<{ search?: string; date?: string; userId?: number }>({})

  async function fetchEvents(
    page = 1,
    options?: { search?: string; date?: string; userId?: number }
  ) {
    if (page > 1) {
      isLoadingMore.value = true
    } else {
      isLoading.value = true
    }

    if (options) {
      activeFilters.value = {
        search: options.search || undefined,
        date: options.date || undefined,
        userId: options.userId || undefined,
      }
    } else if (page === 1) {
      activeFilters.value = {}
    }
    try {
      const res = await eventsApi.getEvents({
        page,
        search: activeFilters.value.search,
        date: activeFilters.value.date,
        userId: activeFilters.value.userId,
      })
      if (page === 1) {
        events.value = res.data.data
        hasLoaded.value = true
      } else {
        const existingIds = new Set(events.value.map(e => e.id))
        const newEvents = res.data.data.filter((e: Event) => !existingIds.has(e.id))
        events.value.push(...newEvents)
      }
      currentPage.value = res.data.current_page
      lastPage.value = res.data.last_page
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function loadMoreEvents() {
    if (isLoading.value || isLoadingMore.value || !hasMorePages.value) return
    await fetchEvents(currentPage.value + 1)
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
    isLoadingMore,
    hasLoaded,
    currentPage,
    lastPage,
    hasMorePages,
    isSubmitting,
    fetchEvents,
    loadMoreEvents,
    fetchUpcoming,
    createEvent,
    updateEvent,
    rsvp,
    deleteEvent,
  }
})
