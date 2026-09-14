import apiClient from './client'

export function getEvents(page = 1) {
  return apiClient.get(`/events?page=${page}`)
}

export function getUpcomingEvents() {
  return apiClient.get('/events/upcoming')
}

export function createEvent(formData: FormData) {
  return apiClient.post('/events', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function updateEvent(eventId: number, formData: FormData) {
  formData.append('_method', 'PUT')
  return apiClient.post(`/events/${eventId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function rsvpEvent(eventId: number, status: 'confirmed' | 'declined' | 'invited') {
  return apiClient.post(`/events/${eventId}/rsvp`, { status })
}

export function deleteEvent(eventId: number) {
  return apiClient.delete(`/events/${eventId}`)
}
