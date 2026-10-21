import { ref } from 'vue'

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const pullDistance = ref(0)
  const isRefreshingFromPull = ref(false)
  let touchStartY = 0
  let touchStartX = 0
  let isTrackingTouch = false

  function getScrollTop(): number {
    if (typeof window === 'undefined') return 0
    return (
      window.pageYOffset ||
      document.documentElement?.scrollTop ||
      document.body?.scrollTop ||
      window.scrollY ||
      0
    )
  }

  function handleTouchStart(e: TouchEvent) {
    if (isRefreshingFromPull.value) return
    const touch = e.touches[0]
    if (!touch) return

    const scrollTop = getScrollTop()
    // Apenas inicia o rastreamento se estiver rigorosamente no topo do scroll
    if (scrollTop <= 5) {
      touchStartY = touch.clientY
      touchStartX = touch.clientX ?? 0
      isTrackingTouch = true
    } else {
      isTrackingTouch = false
      pullDistance.value = 0
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isTrackingTouch || isRefreshingFromPull.value) return
    const touch = e.touches[0]
    if (!touch) return

    const currentY = touch.clientY
    const currentX = touch.clientX ?? 0
    const diffY = currentY - touchStartY
    const diffX = currentX - touchStartX
    const scrollTop = getScrollTop()

    // Se o usuário rolou para baixo ou não está mais no topo, cancela o rastreamento imediatamente
    // para permitir que o scroll nativo (para cima e para baixo) funcione de forma 100% fluida
    if (scrollTop > 5) {
      isTrackingTouch = false
      pullDistance.value = 0
      return
    }

    // Se o usuário deslizou o dedo para cima (rolando o feed para baixo), cancela o rastreamento
    // para que este gesto nunca intercepte o scroll do usuário
    if (diffY < 0) {
      isTrackingTouch = false
      pullDistance.value = 0
      return
    }

    // Se o movimento for predominantemente horizontal, não é um pull-to-refresh
    if (Math.abs(diffX) > Math.abs(diffY)) {
      isTrackingTouch = false
      pullDistance.value = 0
      return
    }

    // Puxando estritamente para baixo a partir do topo
    if (diffY > 0) {
      if (e.cancelable && typeof e.preventDefault === 'function') {
        e.preventDefault()
      }
      // Elastic resistance
      pullDistance.value = Math.min(75, Math.pow(diffY, 0.85))
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
