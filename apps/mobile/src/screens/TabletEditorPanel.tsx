import {
  Check,
  DotsThree,
  FileText,
  PencilSimple,
  Star,
} from 'phosphor-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useState } from 'react'
import { MobileEditorBlocks } from '../components/workspace/MobileEditorBlocks'
import { MobileWysiwygMarkdownEditor } from '../components/workspace/MobileWysiwygMarkdownEditor'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { MobileChip } from '../ui/MobileChip'
import { MobileIconButton } from '../ui/MobileIconButton'
import { MobilePanel, MobileToolbar, MobileToolbarTitle } from '../ui/MobilePanel'
import { desktopEditorParity, desktopToolbarActionParity } from '../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../ui/tokens'
import type { MobileEditorBlock, MobileNote } from '../workspace/mobileWorkspaceModel'

type TabletEditorPanelProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  initialEditing?: boolean
  note: MobileNote | null
  notes: MobileNote[]
  onNavigateWikilink: (target: string) => void
  onOpenMoreActions: () => void
  onToggleFavorite: () => void
  onUpdateContent: (noteId: string, content: string) => void
}

type EditorToolbarProps = {
  editing: boolean
  note: MobileNote
  onOpenMoreActions: () => void
  onToggleEditing: () => void
  onToggleFavorite: () => void
}

type EditorContentProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  editing: boolean
  note: MobileNote
  notes: MobileNote[]
  onNavigateWikilink: (target: string) => void
  onUpdateContent: (noteId: string, content: string) => void
}

export function TabletEditorPanel(props: TabletEditorPanelProps) {
  const {
    blocks,
    bullets,
    compact,
    initialEditing = false,
    note,
    notes,
    onNavigateWikilink,
    onOpenMoreActions,
    onToggleFavorite,
    onUpdateContent,
  } = props
  const [editing, setEditing] = useState(initialEditing)

  if (!note) {
    return <EmptyEditorPanel />
  }

  return (
    <MobilePanel style={panelStyles.panel} testID="editor-panel">
      <EditorToolbar
        editing={editing}
        note={note}
        onOpenMoreActions={onOpenMoreActions}
        onToggleEditing={() => setEditing((current) => !current)}
        onToggleFavorite={onToggleFavorite}
      />
      {editing ? (
        <View style={panelStyles.editorHost} testID="editor-scroll">
          <EditorContent
            blocks={blocks}
            bullets={bullets}
            compact={compact}
            editing={editing}
            note={note}
            notes={notes}
            onNavigateWikilink={onNavigateWikilink}
            onUpdateContent={onUpdateContent}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[panelStyles.content, compact ? panelStyles.contentCompact : null]} testID="editor-scroll">
          <EditorContent
            blocks={blocks}
            bullets={bullets}
            compact={compact}
            editing={editing}
            note={note}
            notes={notes}
            onNavigateWikilink={onNavigateWikilink}
            onUpdateContent={onUpdateContent}
          />
        </ScrollView>
      )}
    </MobilePanel>
  )
}

function EditorToolbar({
  editing,
  note,
  onOpenMoreActions,
  onToggleEditing,
  onToggleFavorite,
}: EditorToolbarProps) {
  return (
    <MobileToolbar testID="editor-toolbar">
      <FileText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
      <MobileToolbarTitle testID="editor-toolbar-title" title={note.title} />
      <MobileChip label={note.workspace} tone="gray" />
      <MobileIconButton
        accessibilityLabel={mobileText(note.favorite ? 'command.note.removeFavorite' : 'command.note.addFavorite')}
        testID="editor-favorite-action"
        onPress={onToggleFavorite}
      >
        <Star color={note.favorite ? mobileColors.primary : mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight={note.favorite ? 'fill' : 'regular'} />
      </MobileIconButton>
      <MobileIconButton
        accessibilityLabel={mobileText(editing ? 'common.save' : 'menu.edit')}
        testID="editor-edit-action"
        onPress={onToggleEditing}
      >
        {editing
          ? <Check color={mobileColors.primary} size={desktopToolbarActionParity.iconSize} weight="bold" />
          : <PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
      </MobileIconButton>
      <MobileIconButton accessibilityLabel={mobileText('editor.toolbar.moreActions')} testID="editor-more-action" onPress={onOpenMoreActions}>
        <DotsThree color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight="bold" />
      </MobileIconButton>
    </MobileToolbar>
  )
}

function EditorContent({
  blocks,
  bullets,
  compact,
  editing,
  note,
  notes,
  onNavigateWikilink,
  onUpdateContent,
}: EditorContentProps) {
  if (editing) {
    return (
      <MobileWysiwygMarkdownEditor
        key={note.id}
        blocks={blocks}
        bullets={bullets}
        compact={compact}
        note={note}
        notes={notes}
        onUpdateContent={onUpdateContent}
      />
    )
  }

  return (
    <>
      <View style={panelStyles.titleBlock} testID="editor-title-block">
        <Text style={[panelStyles.title, compact ? panelStyles.titleCompact : null]} testID="editor-title">{note.title}</Text>
      </View>
      <MobileEditorBlocks blocks={blocks} fallbackBullets={bullets} onNavigateWikilink={onNavigateWikilink} />
    </>
  )
}

function EmptyEditorPanel() {
  return (
    <MobilePanel style={panelStyles.panel} testID="editor-panel">
      <MobileToolbar testID="editor-toolbar">
        <FileText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        <MobileToolbarTitle testID="editor-toolbar-title" title={mobileText('inspector.empty.noNoteSelected')} />
      </MobileToolbar>
      <View style={panelStyles.emptyState}>
        <Text style={panelStyles.emptyTitle}>{mobileText('editor.empty.selectNote')}</Text>
      </View>
    </MobilePanel>
  )
}

const panelStyles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    maxWidth: desktopEditorParity.contentMaxWidth,
    paddingHorizontal: desktopEditorParity.contentPaddingHorizontal,
    paddingVertical: desktopEditorParity.contentPaddingVertical,
    width: '100%',
  },
  contentCompact: {
    paddingHorizontal: mobileSpace.xl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpace.xxl,
  },
  emptyTitle: {
    color: mobileColors.textMuted,
    fontSize: mobileType.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  editorHost: {
    flex: 1,
  },
  panel: {
    flex: 1,
  },
  title: {
    color: mobileColors.text,
    fontSize: desktopEditorParity.h1FontSize,
    fontWeight: '700',
    lineHeight: desktopEditorParity.h1LineHeight,
  },
  titleBlock: {
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: desktopEditorParity.h1MarginBottom,
    paddingBottom: desktopEditorParity.h1PaddingBottom,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
})
