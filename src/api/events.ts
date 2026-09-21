import apiClient from './client'

export interface GetEventsParams {
  page?: number
  search?: string
  date?: string
  startDate?: string
  endDate?: string
  userId?: number
}

export function getEvents(paramsOrPage: number | GetEventsParams = 1) {
  const params: Record<string, unknown> = {}
  if (typeof paramsOrPage === 'number') {
    params.page = paramsOrPage
  } else {
    if (paramsOrPage.page) params.page = paramsOrPage.page
    if (paramsOrPage.search) params.search = paramsOrPage.search
    if (paramsOrPage.date) params.date = paramsOrPage.date
    if (paramsOrPage.startDate) params.start_date = paramsOrPage.startDate
    if (paramsOrPage.endDate) params.end_date = paramsOrPage.endDate
    if (paramsOrPage.userId) params.user_id = paramsOrPage.userId
  }
  return apiClient.get('/events', { params })
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

export function getEvent(eventId: number) {
  return apiClient.get(`/events/${eventId}`)
}

export function inviteEventGuests(eventId: number, userIds: number[]) {
  return apiClient.post<{ message: string; event: any }>(`/events/${eventId}/invite`, {
    guests: userIds,
  })
}

export function deleteEvent(eventId: number) {
  return apiClient.delete(`/events/${eventId}`)
}
