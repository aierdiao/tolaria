import {
  DotsThree,
  FileText,
  Star,
} from 'phosphor-react-native'
import { ScrollView, StyleSheet, type TextStyle, View } from 'react-native'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { MobileChip } from '../ui/MobileChip'
import { MobileIconButton } from '../ui/MobileIconButton'
import { MobilePanel, MobileToolbar, MobileToolbarTitle } from '../ui/MobilePanel'
import { mobileColors, mobileRadius, mobileSpace, mobileType } from '../ui/tokens'
import type { MobileEditorBlock, MobileEditorInline, MobileNote } from '../workspace/mobileWorkspaceModel'

export function TabletEditorPanel({
  blocks,
  bullets,
  compact,
  note,
}: {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  note: MobileNote | null
}) {
  if (!note) {
    return <EmptyEditorPanel />
  }

  return (
    <MobilePanel style={panelStyles.panel}>
      <MobileToolbar>
        <FileText color={mobileColors.textMuted} size={18} />
        <MobileToolbarTitle title={note.title} />
        <MobileChip label={note.workspace} tone="gray" />
        <MobileIconButton accessibilityLabel={mobileText('command.note.addFavorite')}>
          <Star color={note.favorite ? mobileColors.primary : mobileColors.textMuted} size={18} weight={note.favorite ? 'fill' : 'regular'} />
        </MobileIconButton>
        <MobileIconButton accessibilityLabel={mobileText('command.group.note')}>
          <DotsThree color={mobileColors.textMuted} size={20} weight="bold" />
        </MobileIconButton>
      </MobileToolbar>
      <ScrollView contentContainerStyle={[panelStyles.content, compact ? panelStyles.contentCompact : null]}>
        <View style={panelStyles.titleBlock}>
          <Text style={[panelStyles.title, compact ? panelStyles.titleCompact : null]}>{note.title}</Text>
        </View>
        <EditorBlocks blocks={blocks} fallbackBullets={bullets} />
      </ScrollView>
    </MobilePanel>
  )
}

function EmptyEditorPanel() {
  return (
    <MobilePanel style={panelStyles.panel}>
      <MobileToolbar>
        <FileText color={mobileColors.textMuted} size={18} />
        <MobileToolbarTitle title={mobileText('inspector.empty.noNoteSelected')} />
      </MobileToolbar>
      <View style={panelStyles.emptyState}>
        <Text style={panelStyles.emptyTitle}>{mobileText('editor.empty.selectNote')}</Text>
      </View>
    </MobilePanel>
  )
}

function EditorBlocks({
  blocks,
  fallbackBullets,
}: {
  blocks: MobileEditorBlock[]
  fallbackBullets: string[]
}) {
  if (blocks.length === 0) {
    return <FallbackBullets bullets={fallbackBullets} />
  }

  return (
    <>
      {blocks.map((block, index) => <EditorBlock block={block} key={`${block.kind}-${index}`} />)}
    </>
  )
}

function FallbackBullets({ bullets }: { bullets: string[] }) {
  return (
    <>
      {bullets.map((item) => (
        <View key={item} style={bulletStyles.row}>
          <Text style={bulletStyles.marker}>•</Text>
          <Text style={textStyles.body}>{item}</Text>
        </View>
      ))}
    </>
  )
}

function EditorBlock({ block }: { block: MobileEditorBlock }) {
  if (block.kind === 'paragraph') {
    return <InlineText content={block.content} style={textStyles.paragraph} />
  }

  if (block.kind === 'heading') {
    return <EditorHeading block={block} />
  }

  if (block.kind === 'bullets') {
    return <EditorBulletList items={block.items} />
  }

  if (block.kind === 'quote') {
    return <EditorQuote content={block.content} />
  }

  return <EditorTable headers={block.headers} rows={block.rows} />
}

function EditorHeading({ block }: { block: Extract<MobileEditorBlock, { kind: 'heading' }> }) {
  return (
    <Text style={[textStyles.heading, block.level === 3 ? textStyles.headingSmall : null]}>
      {block.text}
    </Text>
  )
}

function EditorBulletList({ items }: { items: MobileEditorInline[][] }) {
  return (
    <View style={bulletStyles.group}>
      {items.map((item, index) => (
        <View key={`bullet-${index}`} style={bulletStyles.row}>
          <Text style={bulletStyles.marker}>•</Text>
          <InlineText content={item} style={textStyles.body} />
        </View>
      ))}
    </View>
  )
}

function EditorQuote({ content }: { content: MobileEditorInline[] }) {
  return (
    <View style={quoteStyles.container}>
      <InlineText content={content} style={quoteStyles.text} />
    </View>
  )
}

function InlineText({
  content,
  style,
}: {
  content: MobileEditorInline[]
  style: TextStyle
}) {
  return (
    <Text style={style}>
      {content.map((segment, index) => (
        <Text
          key={`${segment.text}-${index}`}
          style={[
            segment.bold ? inlineStyles.bold : null,
            segment.italic ? inlineStyles.italic : null,
            segment.code ? inlineStyles.code : null,
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  )
}

function EditorTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <View style={tableStyles.table}>
      <View style={[tableStyles.row, tableStyles.headerRow]}>
        {headers.map((header) => (
          <Text key={header} style={[tableStyles.cell, tableStyles.headerCell]}>{header}</Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={tableStyles.row}>
          {row.map((cell, cellIndex) => (
            <Text key={`${cell}-${cellIndex}`} style={tableStyles.cell}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

const panelStyles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    maxWidth: 700,
    paddingHorizontal: mobileSpace.xxl,
    paddingVertical: 40,
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
  panel: {
    flex: 1,
  },
  title: {
    color: mobileColors.text,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  titleBlock: {
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: mobileSpace.xl,
    paddingBottom: mobileSpace.lg,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
})

const textStyles = StyleSheet.create({
  body: {
    flex: 1,
    color: mobileColors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  heading: {
    color: mobileColors.text,
    fontSize: 27,
    fontWeight: '600',
    lineHeight: 38,
    marginBottom: 10,
    marginTop: 28,
  },
  headingSmall: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 8,
    marginTop: 24,
  },
  paragraph: {
    color: mobileColors.text,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: mobileSpace.sm,
  },
})

const inlineStyles = StyleSheet.create({
  bold: {
    color: mobileColors.text,
    fontWeight: '700',
  },
  code: {
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: mobileColors.graySoft,
    color: mobileColors.textMuted,
    fontFamily: 'Menlo',
    fontSize: 14,
  },
  italic: {
    color: mobileColors.text,
    fontStyle: 'italic',
  },
})

const bulletStyles = StyleSheet.create({
  group: {
    marginBottom: mobileSpace.sm,
  },
  marker: {
    color: mobileColors.primary,
    fontSize: 24,
    lineHeight: 23,
    minWidth: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: mobileSpace.xs,
  },
})

const quoteStyles = StyleSheet.create({
  container: {
    borderLeftColor: mobileColors.primary,
    borderLeftWidth: 3,
    marginVertical: mobileSpace.md,
    paddingLeft: mobileSpace.lg,
  },
  text: {
    color: mobileColors.textMuted,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 23,
  },
})

const tableStyles = StyleSheet.create({
  cell: {
    flex: 1,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightColor: mobileColors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    color: mobileColors.text,
    fontSize: mobileType.body,
    lineHeight: 20,
    paddingHorizontal: mobileSpace.md,
    paddingVertical: mobileSpace.sm,
  },
  headerCell: {
    backgroundColor: mobileColors.card,
    fontWeight: '600',
  },
  headerRow: {
    backgroundColor: mobileColors.card,
  },
  row: {
    flexDirection: 'row',
  },
  table: {
    overflow: 'hidden',
    borderColor: mobileColors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRadius: mobileRadius.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: mobileSpace.md,
  },
})
