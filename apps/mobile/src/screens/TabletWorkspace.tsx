import { useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { MobileNoteListPanel } from '../components/workspace/MobileNoteListPanel'
import { MobilePropertiesPanel } from '../components/workspace/MobilePropertiesPanel'
import { MobileSyncStatusBar } from '../components/workspace/MobileSyncStatusBar'
import { MobileWorkspaceSidebar } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { mobileColors } from '../ui/tokens'
import { TabletEditorPanel } from './TabletEditorPanel'

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
      <View style={styles.shell}>
        {compactTablet ? null : <MobileWorkspaceSidebar sections={snapshot.sidebarSections} title={snapshot.source?.label} />}
        <MobileNoteListPanel
          compact={compactTablet}
          notes={snapshot.notes}
          searchQuery={snapshot.searchQuery}
          selectedNoteId={selectedNoteId}
          subtitle={snapshot.noteListSubtitle}
          onSelectNote={setSelectedNoteId}
        />
        <TabletEditorPanel blocks={editorBlocks} compact={compactTablet} note={selectedNote} bullets={editorBullets} />
        <MobilePropertiesPanel compact={compactTablet} note={selectedNote} />
      </View>
      <MobileSyncStatusBar sync={snapshot.sync} />
    </View>
  )
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
})
