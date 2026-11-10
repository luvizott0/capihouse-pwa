import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import OfflineBanner from '@/components/ui/OfflineBanner.vue'
import { useAuthStore } from '@/stores/auth'

const mockIsOnline = ref(true)
const mockNeedRefresh = ref(false)
const mockUpdateServiceWorker = vi.fn<() => Promise<void>>()

vi.mock('@/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: mockIsOnline,
  }),
}))

vi.mock('@/composables/usePwaUpdate', () => ({
  usePwaUpdate: () => ({
    needRefresh: mockNeedRefresh,
    updateServiceWorker: mockUpdateServiceWorker,
  }),
}))

const mockPushSupported = ref(true)
const mockPushIos = ref(false)
const mockPushStandalone = ref(false)
const mockPushPermission = ref<NotificationPermission>('default')
const mockPushSubscribed = ref(false)
const mockPushLoading = ref(false)
const mockPushErrorMessage = ref('')
const mockCheckSubscription = vi.fn<() => Promise<void>>()
const mockSubscribePush = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)

vi.mock('@/composables/useWebPush', () => ({
  useWebPush: () => ({
    isSupported: mockPushSupported,
    isIos: mockPushIos,
    isStandalone: mockPushStandalone,
    permission: mockPushPermission,
    isSubscribed: mockPushSubscribed,
    isLoading: mockPushLoading,
    errorMessage: mockPushErrorMessage,
    checkSubscription: mockCheckSubscription,
    subscribe: mockSubscribePush,
  }),
}))

describe('OfflineBanner / Notification Banner', () => {
  const storageMap = new Map<string, string>()
  const mockLocalStorage = {
    getItem: vi.fn<(key: string) => string | null>((key: string) => storageMap.get(key) ?? null),
    setItem: vi.fn<(key: string, value: string) => void>((key: string, value: string) => {
      storageMap.set(key, value)
    }),
    removeItem: vi.fn<(key: string) => void>((key: string) => {
      storageMap.delete(key)
    }),
    clear: vi.fn<() => void>(() => {
      storageMap.clear()
    }),
  }

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    })
    storageMap.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mockIsOnline.value = true
    mockNeedRefresh.value = false
    mockPushSupported.value = true
    mockPushIos.value = false
    mockPushStandalone.value = false
    mockPushPermission.value = 'default'
    mockPushSubscribed.value = false
    mockPushLoading.value = false
    mockPushErrorMessage.value = ''
  })

  it('does not display push banner when user is not authenticated', () => {
    const authStore = useAuthStore()
    authStore.token = null
    authStore.user = null

    const wrapper = mount(OfflineBanner)
    expect(wrapper.find('.notification-banner').exists()).toBe(false)
  })

  it('displays push banner when user is authenticated and notifications are not enabled', async () => {
    const authStore = useAuthStore()
     
    authStore.token = 'fake-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authStore.user = { id: 1, name: 'Capi User' } as any

    const wrapper = mount(OfflineBanner)
    await flushPromises()

    expect(wrapper.find('.notification-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Ative para receber avisos')
    expect(wrapper.find('.notification-btn').text()).toContain('Ativar Notificações')
  })

  it('does not display push banner if notifications are already subscribed', async () => {
    const authStore = useAuthStore()
     
    authStore.token = 'fake-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authStore.user = { id: 1, name: 'Capi User' } as any
    mockPushSubscribed.value = true

    const wrapper = mount(OfflineBanner)
    await flushPromises()

    expect(wrapper.find('.notification-banner').exists()).toBe(false)
  })

  it('does not display push banner if permission is denied', async () => {
    const authStore = useAuthStore()
     
    authStore.token = 'fake-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authStore.user = { id: 1, name: 'Capi User' } as any
    mockPushPermission.value = 'denied'

    const wrapper = mount(OfflineBanner)
    await flushPromises()

    expect(wrapper.find('.notification-banner').exists()).toBe(false)
  })

  it('hides push banner and saves snooze timestamp when dismissed', async () => {
    const authStore = useAuthStore()
     
    authStore.token = 'fake-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authStore.user = { id: 1, name: 'Capi User' } as any

    const wrapper = mount(OfflineBanner)
    await flushPromises()

    const closeBtn = wrapper.find('.notification-banner .banner-close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    expect(wrapper.find('.notification-banner').exists()).toBe(false)
    const storedDismiss = storageMap.get('capihouse_push_prompt_dismissed_until')
    expect(storedDismiss).toBeTruthy()
    expect(Number(storedDismiss)).toBeGreaterThan(Date.now())
  })

  it('calls subscribePush when action button is clicked', async () => {
    const authStore = useAuthStore()
     
    authStore.token = 'fake-token'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authStore.user = { id: 1, name: 'Capi User' } as any

    const wrapper = mount(OfflineBanner)
    await flushPromises()

    const actionBtn = wrapper.find('.notification-btn')
    await actionBtn.trigger('click')

    expect(mockSubscribePush).toHaveBeenCalled()
  })
})
