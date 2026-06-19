import type { ReactNode } from 'react'
import { Animated as NativeAnimated, StyleSheet, View, type ViewProps } from 'react-native'
import Reanimated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated'
import {
  phoneWorkspaceTransitionDirection,
  phoneWorkspaceTransitionDurationMs,
  type PhoneWorkspaceState,
  type PhoneWorkspaceTransitionDirection,
} from './phoneWorkspaceTransitions'

type PhoneWorkspaceTransitionProps = {
  children: ReactNode
  dragX?: NativeAnimated.Value
  preview?: ReactNode
  previousState: PhoneWorkspaceState
  state: PhoneWorkspaceState
  swipeHandlers?: ViewProps
}

export function PhoneWorkspaceTransition({
  children,
  dragX,
  previousState,
  preview,
  state,
  swipeHandlers,
}: PhoneWorkspaceTransitionProps) {
  const direction = phoneWorkspaceTransitionDirection(previousState, state)
  const dragStyle = dragX ? { transform: [{ translateX: dragX }] } : null

  return (
    <View
      {...swipeHandlers}
      style={styles.stage}
      testID="phone-transition-stage"
    >
      {preview ? <View pointerEvents="none" style={styles.previewLayer}>{preview}</View> : null}
      <NativeAnimated.View style={[styles.stage, dragStyle]}>
        <Reanimated.View
          entering={enteringTransition(direction)}
          key={state}
          style={styles.stage}
        >
          {children}
        </Reanimated.View>
      </NativeAnimated.View>
    </View>
  )
}

function enteringTransition(direction: PhoneWorkspaceTransitionDirection) {
  if (direction === 'fromLeft') return SlideInLeft.duration(phoneWorkspaceTransitionDurationMs)
  if (direction === 'fromRight') return SlideInRight.duration(phoneWorkspaceTransitionDurationMs)
  return FadeIn.duration(100)
}

const styles = StyleSheet.create({
  previewLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    flex: 1,
  },
})
