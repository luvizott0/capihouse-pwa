import { ref, computed } from 'vue'
import {
  getVapidPublicKey,
  subscribeDevice,
  unsubscribeDevice,
  sendTestPush,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/push'
import type { NotificationPreferences } from '@/types/models'

// Utility to convert VAPID base64 string to Uint8Array for browser PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useWebPush() {
  const isSupported = computed(() => {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  })

  const isIos = computed(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(ua)
  })

  const isStandalone = computed(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari navigator.standalone check
      window.navigator.standalone === true
    )
  })

  const permission = ref<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const isSubscribed = ref(false)
  const isLoading = ref(false)
  const isTesting = ref(false)
  const isSavingPreferences = ref(false)
  const statusMessage = ref('')
  const errorMessage = ref('')

  const preferences = ref<NotificationPreferences>({
    likes: true,
    comments: true,
    mentions: true,
    group_invites: true,
    event_invites: true,
  })
  const registeredDevicesCount = ref(0)

  async function checkSubscription() {
    if (!isSupported.value) return

    try {
      permission.value = Notification.permission
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
    } catch (err) {
      console.error('Falha ao verificar subscription push:', err)
    }
  }

  async function loadPreferences() {
    try {
      const res = await getNotificationPreferences()
      preferences.value = res.preferences
      registeredDevicesCount.value = res.subscriptions_count
    } catch (err) {
      console.error('Falha ao carregar preferências de notificação:', err)
    }
  }

  async function subscribe(): Promise<boolean> {
    if (!isSupported.value) {
      errorMessage.value = 'Seu navegador não suporta notificações Push.'
      return false
    }

    isLoading.value = true
    errorMessage.value = ''
    statusMessage.value = ''

    try {
      // 1. Request browser permission
      const permResult = await Notification.requestPermission()
      permission.value = permResult

      if (permResult !== 'granted') {
        errorMessage.value = 'Permissão de notificação foi negada no navegador.'
        isLoading.value = false
        return false
      }

      // 2. Fetch VAPID public key
      const vapidKey = await getVapidPublicKey()
      if (!vapidKey) {
        throw new Error('Chave pública VAPID não configurada no servidor.')
      }

      // 3. Register push subscription with Service Worker
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidKey)
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        })
      }

      // 4. Send subscription keys to Backend
      const rawSub = subscription.toJSON()
      if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
        throw new Error('Inscrição inválida gerada pelo navegador.')
      }

      await subscribeDevice({
        endpoint: rawSub.endpoint,
        keys: {
          p256dh: rawSub.keys.p256dh,
          auth: rawSub.keys.auth,
        },
      })

      isSubscribed.value = true
      statusMessage.value = 'Notificações push ativadas com sucesso neste aparelho!'
      await loadPreferences()
      return true
    } catch (err: unknown) {
      console.error('Erro ao ativar push notifications:', err)
      errorMessage.value =
        err instanceof Error ? err.message : 'Erro ao ativar notificações no dispositivo.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function unsubscribe(): Promise<boolean> {
    if (!isSupported.value) return false

    isLoading.value = true
    errorMessage.value = ''
    statusMessage.value = ''

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await unsubscribeDevice(subscription.endpoint)
        await subscription.unsubscribe()
      }

      isSubscribed.value = false
      statusMessage.value = 'Notificações desativadas para este aparelho.'
      await loadPreferences()
      return true
    } catch (err: unknown) {
      console.error('Erro ao desativar push:', err)
      errorMessage.value =
        err instanceof Error ? err.message : 'Erro ao desativar notificações no dispositivo.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function testPush(): Promise<boolean> {
    isTesting.value = true
    errorMessage.value = ''
    statusMessage.value = ''

    try {
      const res = await sendTestPush()
      statusMessage.value = res.message || 'Notificação de teste disparada!'
      return true
    } catch (err: unknown) {
      errorMessage.value =
        err instanceof Error ? err.message : 'Falha ao disparar teste de notificação.'
      return false
    } finally {
      isTesting.value = false
    }
  }

  async function updatePreference(key: keyof NotificationPreferences, value: boolean) {
    preferences.value[key] = value
    isSavingPreferences.value = true
    try {
      await updateNotificationPreferences({ [key]: value })
    } catch (err) {
      console.error('Erro ao atualizar preferência:', err)
      // Revert if error
      preferences.value[key] = !value
    } finally {
      isSavingPreferences.value = false
    }
  }

  return {
    isSupported,
    isIos,
    isStandalone,
    permission,
    isSubscribed,
    isLoading,
    isTesting,
    isSavingPreferences,
    statusMessage,
    errorMessage,
    preferences,
    registeredDevicesCount,
    checkSubscription,
    loadPreferences,
    subscribe,
    unsubscribe,
    testPush,
    updatePreference,
  }
}
