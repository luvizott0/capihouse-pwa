import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLongPress } from '@/composables/useLongPress'

describe('useLongPress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers onClick when released before delay threshold and click follows', () => {
    const onLongPress = vi.fn<() => void>()
    const onClick = vi.fn<() => void>()

    const { onPointerDown, onPointerUp, handleClick } = useLongPress(onLongPress, onClick, { delay: 500 })

    const downEvent = { clientX: 100, clientY: 100, button: 0, pointerType: 'mouse' } as PointerEvent
    onPointerDown(downEvent)

    // Advance 150ms (< 500ms)
    vi.advanceTimersByTime(150)

    onPointerUp()

    // Browser fires native click event after mouseup/pointerup
    const clickEvent = { preventDefault: vi.fn<() => void>(), stopPropagation: vi.fn<() => void>() } as unknown as MouseEvent
    handleClick(clickEvent)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('triggers onLongPress when held for >= delay threshold and does not trigger onClick', () => {
    const onLongPress = vi.fn<() => void>()
    const onClick = vi.fn<() => void>()

    const { onPointerDown, onPointerUp, handleClick } = useLongPress(onLongPress, onClick, { delay: 500 })

    const downEvent = { clientX: 100, clientY: 100, button: 0, pointerType: 'touch' } as PointerEvent
    onPointerDown(downEvent)

    // Advance 550ms (>= 500ms)
    vi.advanceTimersByTime(550)

    expect(onLongPress).toHaveBeenCalledTimes(1)

    // Now release pointer
    onPointerUp()

    // Subsequent click event should be prevented and NOT trigger onClick
    const clickEvent = { preventDefault: vi.fn<() => void>(), stopPropagation: vi.fn<() => void>() } as unknown as MouseEvent
    handleClick(clickEvent)

    expect(clickEvent.preventDefault).toHaveBeenCalled()
    expect(clickEvent.stopPropagation).toHaveBeenCalled()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('cancels long press timer if movement exceeds moveThreshold', () => {
    const onLongPress = vi.fn<() => void>()
    const onClick = vi.fn<() => void>()

    const { onPointerDown, onPointerMove, onPointerUp, handleClick } = useLongPress(onLongPress, onClick, {
      delay: 500,
      moveThreshold: 10,
    })

    const downEvent = { clientX: 100, clientY: 100, button: 0, pointerType: 'touch' } as PointerEvent
    onPointerDown(downEvent)

    // Pointer moves 25px (exceeds 10px threshold)
    const moveEvent = { clientX: 125, clientY: 100 } as PointerEvent
    onPointerMove(moveEvent)

    // Advance beyond delay
    vi.advanceTimersByTime(600)

    // onLongPress should not trigger because user was dragging / scrolling
    expect(onLongPress).not.toHaveBeenCalled()

    onPointerUp()

    const clickEvent = { preventDefault: vi.fn<() => void>(), stopPropagation: vi.fn<() => void>() } as unknown as MouseEvent
    handleClick(clickEvent)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
