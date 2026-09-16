import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useImageViewerStore } from '@/stores/imageViewer'

describe('ImageViewer Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default closed state', () => {
    const store = useImageViewerStore()
    expect(store.isOpen).toBe(false)
    expect(store.items).toEqual([])
    expect(store.currentIndex).toBe(0)
    expect(store.currentItem).toBeNull()
  })

  it('opens single image correctly', () => {
    const store = useImageViewerStore()
    store.openImage('https://example.com/avatar.jpg', 'Capivara', 'Foto de Perfil')

    expect(store.isOpen).toBe(true)
    expect(store.items).toHaveLength(1)
    expect(store.currentIndex).toBe(0)
    expect(store.currentItem).toEqual({
      url: 'https://example.com/avatar.jpg',
      title: 'Capivara',
      subtitle: 'Foto de Perfil',
    })
  })

  it('opens gallery and allows next/prev navigation', () => {
    const store = useImageViewerStore()
    const gallery = [
      { url: 'https://example.com/1.jpg', title: 'Foto 1' },
      { url: 'https://example.com/2.jpg', title: 'Foto 2' },
      { url: 'https://example.com/3.jpg', title: 'Foto 3' },
    ]

    store.openGallery(gallery, 1)

    expect(store.isOpen).toBe(true)
    expect(store.items).toHaveLength(3)
    expect(store.currentIndex).toBe(1)
    expect(store.currentItem?.url).toBe('https://example.com/2.jpg')

    store.next()
    expect(store.currentIndex).toBe(2)
    expect(store.currentItem?.url).toBe('https://example.com/3.jpg')

    // Cannot go past last
    store.next()
    expect(store.currentIndex).toBe(2)

    store.prev()
    expect(store.currentIndex).toBe(1)

    store.prev()
    expect(store.currentIndex).toBe(0)

    // Cannot go before first
    store.prev()
    expect(store.currentIndex).toBe(0)
  })

  it('closes properly and clears items', () => {
    const store = useImageViewerStore()
    store.openImage('https://example.com/pic.jpg')
    expect(store.isOpen).toBe(true)

    store.close()
    expect(store.isOpen).toBe(false)
    expect(store.items).toEqual([])
    expect(store.currentIndex).toBe(0)
  })
})
