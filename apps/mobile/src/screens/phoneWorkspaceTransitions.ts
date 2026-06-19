export type PhoneWorkspaceState = 'editor' | 'list' | 'properties' | 'sidebar'
export type PhoneWorkspaceSwipeDirection = 'left' | 'right'
export type PhoneWorkspaceTransitionDirection = 'fade' | 'fromLeft' | 'fromRight'

export const phoneWorkspaceTransitionDurationMs = 180

const phoneStateOrder = {
  sidebar: 0,
  list: 1,
  editor: 2,
  properties: 3,
} satisfies Record<PhoneWorkspaceState, number>

const phoneSwipeDestinations: Record<PhoneWorkspaceState, Partial<Record<PhoneWorkspaceSwipeDirection, PhoneWorkspaceState>>> = {
  editor: { left: 'properties', right: 'list' },
  list: { right: 'sidebar' },
  properties: { right: 'editor' },
  sidebar: { left: 'list' },
}

export function phoneWorkspaceTransitionDirection(
  previousState: PhoneWorkspaceState,
  nextState: PhoneWorkspaceState,
): PhoneWorkspaceTransitionDirection {
  if (previousState === nextState) return 'fade'
  return phoneStateOrder[nextState] > phoneStateOrder[previousState] ? 'fromRight' : 'fromLeft'
}

export function phoneWorkspaceSwipeDestination(
  state: PhoneWorkspaceState,
  direction: PhoneWorkspaceSwipeDirection,
): PhoneWorkspaceState | null {
  return phoneSwipeDestinations[state][direction] ?? null
}

export function phoneWorkspaceDragOffset(
  state: PhoneWorkspaceState,
  dx: number,
  width: number,
): number {
  const direction = swipeDirectionForOffset(dx)
  if (!direction || !phoneWorkspaceSwipeDestination(state, direction)) return 0
  const maxOffset = Math.max(0, width)
  return Math.max(-maxOffset, Math.min(maxOffset, dx))
}

function swipeDirectionForOffset(dx: number): PhoneWorkspaceSwipeDirection | null {
  if (dx < 0) return 'left'
  if (dx > 0) return 'right'
  return null
}
