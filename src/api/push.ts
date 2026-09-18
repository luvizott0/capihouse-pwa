import client from './client'
import type { NotificationPreferences, PushSubscriptionData } from '@/types/models'

export interface PushKeyResponse {
  publicKey: string
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences
  subscriptions_count: number
}

export async function getVapidPublicKey(): Promise<string> {
  const { data } = await client.get<PushKeyResponse>('/push/key')
  return data.publicKey
}

export async function subscribeDevice(subscription: PushSubscriptionData): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/push/subscribe', subscription)
  return data
}

export async function unsubscribeDevice(endpoint: string): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/push/unsubscribe', { endpoint })
  return data
}

export async function sendTestPush(): Promise<{ message: string; subscriptions_count: number }> {
  const { data } = await client.post<{ message: string; subscriptions_count: number }>('/push/test')
  return data
}

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const { data } = await client.get<NotificationPreferencesResponse>('/user/notification-preferences')
  return data
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{ message: string; preferences: NotificationPreferences }> {
  const { data } = await client.put<{ message: string; preferences: NotificationPreferences }>(
    '/user/notification-preferences',
    preferences
  )
  return data
}
