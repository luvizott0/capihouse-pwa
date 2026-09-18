import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { smoothScrollToTop } from '../scroll'

describe('smoothScrollToTop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.pageYOffset = 500
    document.documentElement.scrollTop = 500
    document.body.scrollTop = 500
    window.scrollTo = vi.fn((x: number, y: number) => {
      window.pageYOffset = y
      document.documentElement.scrollTop = y
      document.body.scrollTop = y
    }) as any
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does nothing if already at the top', () => {
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    smoothScrollToTop(400)
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('animates scroll to top smoothly and reaches 0', () => {
    smoothScrollToTop(400)

    // Advance time and execute animation frames
    vi.advanceTimersByTime(200)
    expect(window.scrollTo).toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(window.pageYOffset).toBe(0)
  })

  it('cancels animation if user interacts', () => {
    smoothScrollToTop(400)
    vi.advanceTimersByTime(100)
    const currentScrollCalls = vi.mocked(window.scrollTo).mock.calls.length
    expect(currentScrollCalls).toBeGreaterThan(0)

    // Simulate wheel event
    window.dispatchEvent(new Event('wheel'))

    vi.advanceTimersByTime(300)
    // No more calls should have occurred after cancel
    expect(vi.mocked(window.scrollTo).mock.calls.length).toBe(currentScrollCalls)
  })
})
