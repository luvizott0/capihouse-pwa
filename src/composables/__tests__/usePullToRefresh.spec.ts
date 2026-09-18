import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePullToRefresh } from '../usePullToRefresh'

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.scrollY = 0
  })

  function createTouchEvent(clientY: number) {
    return {
      touches: [{ clientY }] as unknown as TouchList,
    } as unknown as TouchEvent
  }

  it('initializes with default values', () => {
    const onRefresh = vi.fn<() => void>()
    const { pullDistance, isRefreshingFromPull } = usePullToRefresh(onRefresh)

    expect(pullDistance.value).toBe(0)
    expect(isRefreshingFromPull.value).toBe(false)
  })

  it('tracks touch when window.scrollY <= 5 and calculates pullDistance on touchMove', () => {
    const onRefresh = vi.fn<() => void>()
    const { pullDistance, handleTouchStart, handleTouchMove } = usePullToRefresh(onRefresh)

    handleTouchStart(createTouchEvent(100))
    handleTouchMove(createTouchEvent(150))

    expect(pullDistance.value).toBeGreaterThan(0)
    expect(pullDistance.value).toBeLessThanOrEqual(75)
  })

  it('ignores touch when window.scrollY > 5', () => {
    window.scrollY = 20
    const onRefresh = vi.fn<() => void>()
    const { pullDistance, handleTouchStart, handleTouchMove } = usePullToRefresh(onRefresh)

    handleTouchStart(createTouchEvent(100))
    handleTouchMove(createTouchEvent(150))

    expect(pullDistance.value).toBe(0)
  })

  it('resets pullDistance on touchEnd without refreshing if distance is under threshold', async () => {
    const onRefresh = vi.fn<() => void>()
    const { pullDistance, isRefreshingFromPull, handleTouchStart, handleTouchMove, handleTouchEnd } =
      usePullToRefresh(onRefresh)

    handleTouchStart(createTouchEvent(100))
    handleTouchMove(createTouchEvent(120)) // small pull (< 50)
    await handleTouchEnd()

    expect(pullDistance.value).toBe(0)
    expect(isRefreshingFromPull.value).toBe(false)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('triggers onRefresh when pullDistance >= 50 on touchEnd', async () => {
    const onRefresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    const { handleTouchStart, handleTouchMove, handleTouchEnd } =
      usePullToRefresh(onRefresh)

    handleTouchStart(createTouchEvent(100))
    handleTouchMove(createTouchEvent(250)) // large pull (diff = 150 -> distance >= 50)
    await handleTouchEnd()

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
