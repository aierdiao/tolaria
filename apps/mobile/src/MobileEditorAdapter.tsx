import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { MobileNote } from './mobileNoteProjection'
import { createMobileEditorDocument } from './mobileEditorDocument'
import { styles } from './styles'

export function MobileEditorAdapter({ note }: { note: MobileNote }) {
  const document = useMemo(() => createMobileEditorDocument(note), [note])

  return (
    <ScrollView contentContainerStyle={styles.editorContent}>
      <View style={styles.breadcrumbRow}>
        <Text style={styles.breadcrumbText}>{note.type}</Text>
        <Text style={styles.breadcrumbDivider}>/</Text>
        <Text style={styles.breadcrumbText}>{note.id}</Text>
      </View>
      <Text style={styles.editorTitle}>{document.title}</Text>
      {document.blocks.map((block) => (
        <Text key={block.id} style={block.kind === 'bullet' ? styles.editorBullet : styles.editorParagraph}>
          {block.text}
        </Text>
      ))}
    </ScrollView>
  )
}
