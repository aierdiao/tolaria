import { desktopPanelParity } from '../ui/desktopParity'

export const tabletReadableEditorMinWidth = 520

const tabletAllPanelsMinWidth = desktopPanelParity.sidebarWidth
  + desktopPanelParity.noteListWidth
  + desktopPanelParity.inspectorWidth
  + tabletReadableEditorMinWidth

export function tabletScreenModeForWindow({
  height,
  nativeIpad,
  screenHeight,
  screenWidth,
  width,
}: {
  height: number
  nativeIpad: boolean
  screenHeight: number
  screenWidth: number
  width: number
}) {
  return {
    compactTablet: !nativeIpad && width < 1080 && width < height && screenWidth < screenHeight,
    defaultPropertiesVisible: nativeIpad ? width >= tabletAllPanelsMinWidth : true,
  }
}
