import { ref } from 'vue'

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const pullDistance = ref(0)
  const isRefreshingFromPull = ref(false)
  let touchStartY = 0
  let isTrackingTouch = false

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    if (touch && window.scrollY <= 5 && !isRefreshingFromPull.value) {
      touchStartY = touch.clientY
      isTrackingTouch = true
    } else {
      isTrackingTouch = false
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isTrackingTouch || isRefreshingFromPull.value) return
    const touch = e.touches[0]
    if (!touch) return
    const currentY = touch.clientY
    const diff = currentY - touchStartY

    if (diff > 0 && window.scrollY <= 5) {
      // Elastic resistance
      pullDistance.value = Math.min(75, Math.pow(diff, 0.85))
    } else {
      pullDistance.value = 0
    }
  }

  async function handleTouchEnd() {
    if (!isTrackingTouch) return
    isTrackingTouch = false

    if (pullDistance.value >= 50 && !isRefreshingFromPull.value) {
      isRefreshingFromPull.value = true
      pullDistance.value = 50

      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(12)
        }
        await onRefresh()
      } finally {
        setTimeout(() => {
          pullDistance.value = 0
          isRefreshingFromPull.value = false
        }, 300)
      }
    } else {
      pullDistance.value = 0
    }
  }

  return {
    pullDistance,
    isRefreshingFromPull,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
