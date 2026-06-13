import { useMemo } from 'react'
import { PanResponder, type PanResponderGestureState } from 'react-native'

const MIN_DISTANCE = 56
const MIN_CAPTURE_DISTANCE = 12
const MAX_VERTICAL_DRIFT = 40

export function useHorizontalSwipe({
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
}: {
  disabled?: boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}) {
  return useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => shouldCapture(gesture, disabled),
      onMoveShouldSetPanResponderCapture: (_, gesture) => shouldCapture(gesture, disabled),
      onPanResponderRelease: (_, gesture) => {
        if (!isCommittedSwipe(gesture)) return
        if (gesture.dx < 0) onSwipeLeft?.()
        if (gesture.dx > 0) onSwipeRight?.()
      },
      onPanResponderTerminationRequest: () => true,
    }).panHandlers,
    [disabled, onSwipeLeft, onSwipeRight],
  )
}

function shouldCapture(gesture: PanResponderGestureState, disabled: boolean) {
  if (disabled) return false
  return Math.abs(gesture.dx) > MIN_CAPTURE_DISTANCE && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4
}

function isCommittedSwipe(gesture: PanResponderGestureState) {
  return Math.abs(gesture.dx) >= MIN_DISTANCE
    && Math.abs(gesture.dy) <= MAX_VERTICAL_DRIFT
}
