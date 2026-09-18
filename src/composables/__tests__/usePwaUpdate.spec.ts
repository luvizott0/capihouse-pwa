import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockNeedRefresh = ref(false)
const mockOfflineReady = ref(false)
const mockUpdateServiceWorker = vi.fn<() => void>()

vi.mock('virtual:pwa-register/vue', () => ({
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
})
