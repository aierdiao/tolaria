import { useCallback, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { MobileNoteListPanel } from '../components/workspace/MobileNoteListPanel'
import { MobilePropertiesPanel } from '../components/workspace/MobilePropertiesPanel'
import { MobileSyncStatusBar } from '../components/workspace/MobileSyncStatusBar'
import { MobileWorkspaceSidebar } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileEditorBlock, MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { mobileColors } from '../ui/tokens'
import { useHorizontalSwipe } from '../ui/useHorizontalSwipe'
import { TabletEditorPanel } from './TabletEditorPanel'

type TabletPanel = 'noteList' | 'properties' | 'sidebar'
type TabletWorkspaceChromeProps = {
  compactTablet: boolean
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
  noteListSubtitle: string
  notes: MobileNote[]
  onSelectNote: (noteId: string) => void
  searchQuery?: string
  selectedNote: MobileNote | null
  selectedNoteId: string | null
  snapshot: MobileWorkspaceSnapshot
}

export function TabletWorkspace({
  snapshot,
}: {
  snapshot: MobileWorkspaceSnapshot
}) {
  const { width } = useWindowDimensions()
  const {
    editorBlocks,
    editorBullets,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
  } = useTabletSelection(snapshot)
  const compactTablet = width < 1180

  return (
    <View style={styles.shellRoot}>
      <TabletWorkspaceChrome
        compactTablet={compactTablet}
        editorBlocks={editorBlocks}
        editorBullets={editorBullets}
        noteListSubtitle={snapshot.noteListSubtitle}
        notes={snapshot.notes}
        searchQuery={snapshot.searchQuery}
        selectedNote={selectedNote}
        selectedNoteId={selectedNoteId}
        snapshot={snapshot}
        onSelectNote={setSelectedNoteId}
      />
      <MobileSyncStatusBar sync={snapshot.sync} />
    </View>
  )
}

function TabletWorkspaceChrome(props: TabletWorkspaceChromeProps) {
  const {
    compactTablet,
    editorBlocks,
    editorBullets,
    noteListSubtitle,
    notes,
    onSelectNote,
    searchQuery,
    selectedNote,
    selectedNoteId,
    snapshot,
  } = props
  const gestures = useTabletPanelGestures(compactTablet)

  return (
    <View style={styles.shell}>
      {gestures.showSidebar ? (
        <View {...gestures.sidebarSwipe}>
          <MobileWorkspaceSidebar sections={snapshot.sidebarSections} title={snapshot.source?.label} />
        </View>
      ) : <SwipeRail edge="left" swipeHandlers={gestures.sidebarRevealSwipe} />}
      {gestures.noteListVisible ? (
        <View {...gestures.noteListSwipe}>
          <MobileNoteListPanel
            compact={compactTablet}
            notes={notes}
            searchQuery={searchQuery}
            selectedNoteId={selectedNoteId}
            subtitle={noteListSubtitle}
            onSelectNote={onSelectNote}
          />
        </View>
      ) : <SwipeRail edge="left" swipeHandlers={gestures.noteListRevealSwipe} />}
      <TabletEditorPanel blocks={editorBlocks} compact={compactTablet} note={selectedNote} bullets={editorBullets} />
      {gestures.propertiesVisible ? (
        <View {...gestures.propertiesSwipe}>
          <MobilePropertiesPanel compact={compactTablet} note={selectedNote} />
        </View>
      ) : <SwipeRail edge="right" swipeHandlers={gestures.propertiesRevealSwipe} />}
    </View>
  )
}

function SwipeRail({
  edge,
  swipeHandlers,
}: {
  edge: 'left' | 'right'
  swipeHandlers: ReturnType<typeof useHorizontalSwipe>
}) {
  return <View {...swipeHandlers} style={[styles.swipeRail, edge === 'right' ? styles.swipeRailRight : null]} />
}

function useTabletPanelVisibility() {
  const [visiblePanels, setVisiblePanels] = useState<Record<TabletPanel, boolean>>({
    noteList: true,
    properties: true,
    sidebar: true,
  })
  const setPanelVisibility = useCallback((panel: TabletPanel, visible: boolean) => {
    setVisiblePanels((current) => current[panel] === visible ? current : { ...current, [panel]: visible })
  }, [])

  return {
    hidePanel: useCallback((panel: TabletPanel) => setPanelVisibility(panel, false), [setPanelVisibility]),
    noteListVisible: visiblePanels.noteList,
    propertiesVisible: visiblePanels.properties,
    showPanel: useCallback((panel: TabletPanel) => setPanelVisibility(panel, true), [setPanelVisibility]),
    sidebarVisible: visiblePanels.sidebar,
  }
}

function useTabletPanelGestures(compactTablet: boolean) {
  const { hidePanel, noteListVisible, propertiesVisible, showPanel, sidebarVisible } = useTabletPanelVisibility()
  const showSidebar = !compactTablet && sidebarVisible

  return {
    noteListRevealSwipe: useHorizontalSwipe({
      disabled: noteListVisible,
      onSwipeRight: () => showPanel('noteList'),
    }),
    noteListSwipe: useHorizontalSwipe({
      disabled: !noteListVisible,
      onSwipeLeft: () => hidePanel('noteList'),
    }),
    noteListVisible,
    propertiesRevealSwipe: useHorizontalSwipe({
      disabled: propertiesVisible,
      onSwipeLeft: () => showPanel('properties'),
    }),
    propertiesSwipe: useHorizontalSwipe({
      disabled: !propertiesVisible,
      onSwipeRight: () => hidePanel('properties'),
    }),
    propertiesVisible,
    showSidebar,
    sidebarRevealSwipe: useHorizontalSwipe({
      disabled: showSidebar || compactTablet,
      onSwipeRight: () => showPanel('sidebar'),
    }),
    sidebarSwipe: useHorizontalSwipe({
      disabled: !showSidebar,
      onSwipeLeft: () => hidePanel('sidebar'),
    }),
  }
}

function useTabletSelection(snapshot: MobileWorkspaceSnapshot) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialSelectedNoteId(snapshot))
  const selectedNote = selectedMobileNote(snapshot.notes, selectedNoteId)

  return {
    editorBlocks: selectedNote?.editorBlocks ?? snapshot.editorBlocks,
    editorBullets: selectedNote?.editorBullets ?? snapshot.editorBullets,
    selectedNote,
    selectedNoteId,
    setSelectedNoteId,
  }
}

function initialSelectedNoteId(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.selectedNoteId ?? snapshot.notes[0]?.id ?? null
}

function selectedMobileNote(notes: MobileNote[], selectedNoteId: string | null) {
  return notes.find((note) => note.id === selectedNoteId) ?? notes[0] ?? null
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: mobileColors.app,
  },
  shellRoot: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: mobileColors.app,
  },
  swipeRail: {
    width: 18,
    backgroundColor: mobileColors.card,
    borderRightColor: mobileColors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  swipeRailRight: {
    borderLeftColor: mobileColors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 0,
  },
})
