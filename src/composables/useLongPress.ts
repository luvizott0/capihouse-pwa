import { ref } from 'vue'

export interface UseLongPressOptions {
  /** Duration in milliseconds to trigger a long press. Default: 500 */
  delay?: number
  /** Maximum pixel movement allowed before canceling long press (e.g. while scrolling). Default: 10 */
  moveThreshold?: number
  /** Vibrate duration in ms on trigger. Set to false to disable. Default: 40 */
  vibrate?: number | boolean
}

export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  options: UseLongPressOptions = {}
) {
  const { delay = 500, moveThreshold = 10, vibrate = 40 } = options

  const isLongPressTriggered = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let preventNextClick = false

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function onPointerDown(e: PointerEvent) {
    // Only primary button (left click / touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return

    preventNextClick = false
    isLongPressTriggered.value = false
    startX = e.clientX
    startY = e.clientY

    clearTimer()
    timer = setTimeout(() => {
      isLongPressTriggered.value = true
      preventNextClick = true
      if (vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(typeof vibrate === 'number' ? vibrate : 40)
        } catch {
          // Ignore
        }
      }
      onLongPress()
    }, delay)
  }

  function onPointerMove(e: PointerEvent) {
    if (!timer) return

    const deltaX = Math.abs(e.clientX - startX)
    const deltaY = Math.abs(e.clientY - startY)

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      clearTimer()
    }
  }

  function onPointerUp(_e?: PointerEvent) {
    clearTimer()
  }

  function onPointerCancel() {
    clearTimer()
    preventNextClick = false
    isLongPressTriggered.value = false
  }

  function onPointerLeave() {
    clearTimer()
  }

  function handleClick(e: MouseEvent) {
    if (preventNextClick || isLongPressTriggered.value) {
      e.preventDefault()
      e.stopPropagation()
      preventNextClick = false
      isLongPressTriggered.value = false
      return
    }

    if (onClick) {
      onClick()
    }
  }

  function handleContextMenu(e: MouseEvent) {
    if (preventNextClick || isLongPressTriggered.value) {
      e.preventDefault()
    }
  }

  return {
    isLongPressTriggered,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    handleClick,
    handleContextMenu,
    handlers: {
      onPointerdown: onPointerDown,
      onPointermove: onPointerMove,
      onPointerup: onPointerUp,
      onPointercancel: onPointerCancel,
      onPointerleave: onPointerLeave,
      onClick: handleClick,
      onContextmenu: handleContextMenu,
    },
  }
}
