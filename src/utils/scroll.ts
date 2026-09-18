/**
 * Performs a smooth, eased scroll to the top of the window using requestAnimationFrame.
 *
 * @param targetDuration Optional duration in milliseconds (defaults to dynamic between 400ms and 650ms based on distance)
 */
export function smoothScrollToTop(targetDuration?: number): void {
  if (typeof window === 'undefined') return

  const startY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  if (startY <= 0) return

  // Adaptive duration: smooth glide, minimum 400ms, maximum 650ms
  const duration = targetDuration ?? Math.min(650, Math.max(400, Math.sqrt(startY) * 14))
  const startTime = performance.now()
  let animationFrameId: number | null = null

  const cancelEvents = ['wheel', 'touchstart', 'mousedown']

  const cleanup = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    cancelEvents.forEach(evt => window.removeEventListener(evt, cleanup))
  }

  cancelEvents.forEach(evt => window.addEventListener(evt, cleanup, { passive: true }))

  // easeInOutCubic curve for an ultra-smooth, fluid transition
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function step(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)
    const currentY = Math.max(0, startY * (1 - eased))

    window.scrollTo(0, currentY)
    if (document.documentElement) {
      document.documentElement.scrollTop = currentY
    }
    if (document.body) {
      document.body.scrollTop = currentY
    }

    if (progress < 1) {
      animationFrameId = window.requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  animationFrameId = window.requestAnimationFrame(step)
}
