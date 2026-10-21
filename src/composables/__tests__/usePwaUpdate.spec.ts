import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockNeedRefresh = ref(false)
const mockOfflineReady = ref(false)
const mockUpdateServiceWorker = vi.fn<() => void>()

vi.mock('virtual:pwa-register/vue', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useRegisterSW: vi.fn<() => any>(() => ({
    needRefresh: mockNeedRefresh,
    offlineReady: mockOfflineReady,
    updateServiceWorker: mockUpdateServiceWorker
  }))
}))

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNeedRefresh.value = false
    mockOfflineReady.value = false
  })

  it('exposes update states and actions', async () => {
    const { usePwaUpdate } = await import('../usePwaUpdate')
    const { needRefresh, offlineReady, isChecking, feedbackMessage, checkForUpdates, updateServiceWorker, forceReloadApp } = usePwaUpdate()

    expect(needRefresh).toBeDefined()
    expect(offlineReady).toBeDefined()
    expect(isChecking.value).toBe(false)
    expect(feedbackMessage.value).toBe('')
    expect(typeof checkForUpdates).toBe('function')
    expect(typeof updateServiceWorker).toBe('function')
    expect(typeof forceReloadApp).toBe('function')
  })

  it('calls updateServiceWorker on baseUpdateSW', async () => {
    const { usePwaUpdate } = await import('../usePwaUpdate')
    const { updateServiceWorker } = usePwaUpdate()

    await updateServiceWorker()
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('reports when service worker is not supported or not active', async () => {
    const { usePwaUpdate } = await import('../usePwaUpdate')
    const { checkForUpdates, isChecking } = usePwaUpdate()

    const result = await checkForUpdates()
    expect(isChecking.value).toBe(false)
    expect(result.hasUpdate).toBe(false)
  })

  it('clears caches and unregisters workers during forceReloadApp', async () => {
    const mockDelete = vi.fn<(key: string) => Promise<boolean>>().mockResolvedValue(true)
    const mockKeys = vi.fn<() => Promise<string[]>>().mockResolvedValue(['cache-v1', 'cache-v2'])
    const mockUnregister = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
    const mockGetRegistrations = vi.fn<() => Promise<ServiceWorkerRegistration[]>>().mockResolvedValue([
      { unregister: mockUnregister } as unknown as ServiceWorkerRegistration
    ])

    // Mock caches e navigator.serviceWorker
    vi.stubGlobal('caches', {
      keys: mockKeys,
      delete: mockDelete
    })

    const originalNavigator = global.navigator
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: {
        getRegistrations: mockGetRegistrations,
        addEventListener: vi.fn<() => void>()
      }
    })

    const mockReplace = vi.fn<(url: string) => void>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.location = {
      href: 'http://localhost/',
      origin: 'http://localhost',
      pathname: '/',
      replace: mockReplace,
      reload: vi.fn<() => void>()
    } as any

    const { usePwaUpdate } = await import('../usePwaUpdate')
    const { forceReloadApp, feedbackMessage } = usePwaUpdate()

    await forceReloadApp()

    expect(feedbackMessage.value).toContain('Limpando caches')
    expect(mockKeys).toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith('cache-v1')
    expect(mockDelete).toHaveBeenCalledWith('cache-v2')
    expect(mockGetRegistrations).toHaveBeenCalled()
    expect(mockUnregister).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalled()
  })
})
