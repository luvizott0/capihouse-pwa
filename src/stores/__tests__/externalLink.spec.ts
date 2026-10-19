import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExternalLinkStore } from '@/stores/externalLink'
import * as externalLinksModule from '@/utils/externalLinks'

vi.mock('@/utils/externalLinks', () => ({
  openExternalUrl: vi.fn(),
}))

describe('ExternalLink Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default closed state', () => {
    const store = useExternalLinkStore()
    expect(store.isOpen).toBe(false)
    expect(store.url).toBe('')
    expect(store.domain).toBe('')
    expect(store.isCopied).toBe(false)
  })

  it('open sets url, normalizes protocol and opens modal', () => {
    const store = useExternalLinkStore()
    store.open('www.github.com')

    expect(store.isOpen).toBe(true)
    expect(store.url).toBe('https://www.github.com')
    expect(store.domain).toBe('www.github.com')
  })

  it('preserves existing https protocol and extracts domain properly', () => {
    const store = useExternalLinkStore()
    store.open('https://capihouse.com.br/feed?tab=games')

    expect(store.isOpen).toBe(true)
    expect(store.url).toBe('https://capihouse.com.br/feed?tab=games')
    expect(store.domain).toBe('capihouse.com.br')
  })

  it('close resets isOpen state', () => {
    const store = useExternalLinkStore()
    store.open('https://youtube.com')
    expect(store.isOpen).toBe(true)

    store.close()
    expect(store.isOpen).toBe(false)
  })

  it('confirmOpen calls openExternalUrl and closes modal', () => {
    const store = useExternalLinkStore()
    store.open('https://youtube.com/watch?v=123')

    store.confirmOpen()
    expect(externalLinksModule.openExternalUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=123')
    expect(store.isOpen).toBe(false)
  })
})
