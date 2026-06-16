import { RichText, TenTapStartKit, Toolbar, useEditorBridge, type EditorBridge } from '@10play/tentap-editor'
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  mobileDocumentBody,
  mobileDocumentWithBody,
  mobileMarkdownBodyToTentapHtml,
  mobileNoteEditableContent,
  tiptapJsonToMobileMarkdown,
} from '../../workspace/mobileDocumentContent'
import type { MobileEditorBlock, MobileNote } from '../../workspace/mobileWorkspaceModel'
import { desktopEditorParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace } from '../../ui/tokens'

type MobileWysiwygMarkdownEditorProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  note: MobileNote
  notes: MobileNote[]
  onUpdateContent: (noteId: string, content: string) => void
}

type JsonReadableEditorBridge = EditorBridge & {
  getJSON: () => Promise<unknown>
}

type CssInjectableEditorBridge = EditorBridge & {
  injectCSS: (css: string, tag?: string) => void
}

type TimerHandle = ReturnType<typeof setTimeout>
type NativeTentapEditorBridgeOptions = Omit<MobileWysiwygMarkdownEditorProps, 'notes'> & {
  initialDocumentContent: string
}
type NativeTentapEditorRefs = {
  acceptsEditorChangesRef: MutableRefObject<boolean>
  contentRef: MutableRefObject<string>
  editorReadyTimerRef: MutableRefObject<TimerHandle | null>
  editorRef: MutableRefObject<EditorBridge | null>
  firstEditorSerializationRef: MutableRefObject<boolean>
  hasAcceptedEditorChangeRef: MutableRefObject<boolean>
  saveTimerRef: MutableRefObject<TimerHandle | null>
}

export function MobileWysiwygMarkdownEditor({
  blocks,
  bullets,
  compact,
  note,
  onUpdateContent,
}: MobileWysiwygMarkdownEditorProps) {
  const initialDocumentContent = mobileNoteEditableContent({
    ...note,
    editorBlocks: note.editorBlocks ?? blocks,
    editorBullets: bullets,
  })
  const { editor, injectEditorCss } = useNativeTentapEditorBridge({
    blocks,
    bullets,
    compact,
    initialDocumentContent,
    note,
    onUpdateContent,
  })

  return (
    <View style={nativeEditorStyles.container} testID="editor-wysiwyg-form">
      <RichText
        editor={editor}
        style={nativeEditorStyles.richText}
        testID="editor-wysiwyg-input"
        onLoadEnd={injectEditorCss}
      />
      <KeyboardAvoidingView behavior="padding" style={nativeEditorStyles.toolbarHost}>
        <Toolbar editor={editor} shouldHideDisabledToolbarItems />
      </KeyboardAvoidingView>
    </View>
  )
}

function useNativeTentapEditorBridge({
  blocks,
  bullets,
  compact,
  initialDocumentContent,
  note,
  onUpdateContent,
}: NativeTentapEditorBridgeOptions) {
  const initialBody = mobileDocumentBody(initialDocumentContent)
  const initialBodyHasContent = initialBody.trim().length > 0
  const [initialContent] = useState(() => mobileMarkdownBodyToTentapHtml(initialBody))
  const refs = useNativeTentapEditorRefs(initialDocumentContent)

  const flushEditorDocument = useFlushEditorDocument({
    initialBodyHasContent,
    noteId: note.id,
    onUpdateContent,
    refs,
  })
  const scheduleDocumentFlush = useScheduleDocumentFlush(refs, flushEditorDocument)
  const injectEditorCss = useEditorCssInjection({ compact, refs })

  const editor = useEditorBridge({
    avoidIosKeyboard: true,
    bridgeExtensions: TenTapStartKit,
    initialContent,
    onChange: scheduleDocumentFlush,
  })

  useEditorBridgeRef(refs.editorRef, editor)
  useEditableContentRef({ blocks, bullets, note, refs })
  useResetEditorChangeGate({ initialContent, noteId: note.id, refs })
  useFlushOnUnmount(refs, flushEditorDocument)

  return { editor, injectEditorCss }
}

function useNativeTentapEditorRefs(initialDocumentContent: string): NativeTentapEditorRefs {
  const acceptsEditorChangesRef = useRef(false)
  const contentRef = useRef(initialDocumentContent)
  const editorReadyTimerRef = useRef<TimerHandle | null>(null)
  const editorRef = useRef<EditorBridge | null>(null)
  const firstEditorSerializationRef = useRef(true)
  const hasAcceptedEditorChangeRef = useRef(false)
  const saveTimerRef = useRef<TimerHandle | null>(null)

  return useMemo(() => ({
    acceptsEditorChangesRef,
    contentRef,
    editorReadyTimerRef,
    editorRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    saveTimerRef,
  }), [
    acceptsEditorChangesRef,
    contentRef,
    editorReadyTimerRef,
    editorRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    saveTimerRef,
  ])
}

function useFlushEditorDocument({
  initialBodyHasContent,
  noteId,
  onUpdateContent,
  refs,
}: {
  initialBodyHasContent: boolean
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
}) {
  return useCallback(() => {
    flushEditorDocumentFromBridge({
      initialBodyHasContent,
      noteId,
      onUpdateContent,
      refs,
    })
  }, [initialBodyHasContent, noteId, onUpdateContent, refs])
}

function flushEditorDocumentFromBridge({
  initialBodyHasContent,
  noteId,
  onUpdateContent,
  refs,
}: {
  initialBodyHasContent: boolean
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
}) {
  const editor = refs.editorRef.current
  if (!isJsonReadableEditorBridge(editor)) return

  void editor.getJSON()
    .then((json) => writeEditorJsonToMarkdown({ initialBodyHasContent, json, noteId, onUpdateContent, refs }))
    .catch((error: unknown) => {
      console.warn('[mobile-editor] Failed to read TenTap JSON:', error)
    })
}

function writeEditorJsonToMarkdown({
  initialBodyHasContent,
  json,
  noteId,
  onUpdateContent,
  refs,
}: {
  initialBodyHasContent: boolean
  json: unknown
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
}) {
  const nextMarkdown = tiptapJsonToMobileMarkdown(json)
  if (shouldSkipFirstEmptySerialization(refs, initialBodyHasContent, nextMarkdown)) return

  const nextContent = mobileDocumentWithBody(refs.contentRef.current, `${nextMarkdown}\n`)
  refs.firstEditorSerializationRef.current = false
  if (nextContent !== refs.contentRef.current) onUpdateContent(noteId, nextContent)
}

function shouldSkipFirstEmptySerialization(
  refs: NativeTentapEditorRefs,
  initialBodyHasContent: boolean,
  nextMarkdown: string,
) {
  const shouldSkip = refs.firstEditorSerializationRef.current && initialBodyHasContent && nextMarkdown.trim() === ''
  if (shouldSkip) refs.firstEditorSerializationRef.current = false
  return shouldSkip
}

function useScheduleDocumentFlush(
  refs: NativeTentapEditorRefs,
  flushEditorDocument: () => void,
) {
  const { acceptsEditorChangesRef, hasAcceptedEditorChangeRef, saveTimerRef } = refs

  return useCallback(() => {
    if (!acceptsEditorChangesRef.current) return
    hasAcceptedEditorChangeRef.current = true
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(flushEditorDocument, 250)
  }, [acceptsEditorChangesRef, flushEditorDocument, hasAcceptedEditorChangeRef, saveTimerRef])
}

function useEditorCssInjection({
  compact,
  refs,
}: {
  compact: boolean
  refs: NativeTentapEditorRefs
}) {
  const { acceptsEditorChangesRef, editorReadyTimerRef, editorRef } = refs

  return useCallback(() => {
    if (isCssInjectableEditorBridge(editorRef.current)) {
      editorRef.current.injectCSS(mobileTentapEditorCss(compact), 'tolaria-editor')
    }
    if (editorReadyTimerRef.current) clearTimeout(editorReadyTimerRef.current)
    editorReadyTimerRef.current = setTimeout(() => {
      acceptsEditorChangesRef.current = true
    }, 750)
  }, [acceptsEditorChangesRef, compact, editorReadyTimerRef, editorRef])
}

function useEditorBridgeRef(
  editorRef: MutableRefObject<EditorBridge | null>,
  editor: EditorBridge,
) {
  useEffect(() => {
    editorRef.current = editor
  }, [editor, editorRef])
}

function useEditableContentRef({
  blocks,
  bullets,
  note,
  refs,
}: {
  blocks: MobileEditorBlock[]
  bullets: string[]
  note: MobileNote
  refs: NativeTentapEditorRefs
}) {
  const { contentRef } = refs

  useEffect(() => {
    contentRef.current = mobileNoteEditableContent({
      ...note,
      editorBlocks: note.editorBlocks ?? blocks,
      editorBullets: bullets,
    })
  }, [blocks, bullets, contentRef, note])
}

function useResetEditorChangeGate({
  initialContent,
  noteId,
  refs,
}: {
  initialContent: string
  noteId: string
  refs: NativeTentapEditorRefs
}) {
  const { acceptsEditorChangesRef, firstEditorSerializationRef, hasAcceptedEditorChangeRef } = refs

  useEffect(() => {
    acceptsEditorChangesRef.current = false
    firstEditorSerializationRef.current = true
    hasAcceptedEditorChangeRef.current = false
  }, [acceptsEditorChangesRef, firstEditorSerializationRef, hasAcceptedEditorChangeRef, initialContent, noteId])
}

function useFlushOnUnmount(
  refs: NativeTentapEditorRefs,
  flushEditorDocument: () => void,
) {
  useEffect(() => () => {
    if (refs.editorReadyTimerRef.current) clearTimeout(refs.editorReadyTimerRef.current)
    if (refs.saveTimerRef.current) clearTimeout(refs.saveTimerRef.current)
    if (refs.hasAcceptedEditorChangeRef.current) flushEditorDocument()
  }, [flushEditorDocument, refs])
}

function isJsonReadableEditorBridge(editor: EditorBridge | null): editor is JsonReadableEditorBridge {
  return typeof (editor as Partial<JsonReadableEditorBridge> | null)?.getJSON === 'function'
}

function isCssInjectableEditorBridge(editor: EditorBridge | null): editor is CssInjectableEditorBridge {
  return typeof (editor as Partial<CssInjectableEditorBridge> | null)?.injectCSS === 'function'
}

function mobileTentapEditorCss(compact: boolean): string {
  const horizontalPadding = compact ? mobileSpace.xl : desktopEditorParity.contentPaddingHorizontal
  const h1FontSize = compact ? 30 : desktopEditorParity.h1FontSize
  const h1LineHeight = compact ? 36 : desktopEditorParity.h1LineHeight

  return `
    html, body {
      background: ${mobileColors.editor};
      color: ${mobileColors.text};
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      font-size: ${desktopEditorParity.bodyFontSize}px;
      line-height: ${desktopEditorParity.bodyLineHeight}px;
      margin: 0;
      padding: 0;
    }
    .ProseMirror {
      box-sizing: border-box;
      caret-color: ${mobileColors.primary};
      margin: 0 auto;
      max-width: ${desktopEditorParity.contentMaxWidth}px;
      min-height: 100vh;
      outline: none;
      padding: ${desktopEditorParity.contentPaddingVertical}px ${horizontalPadding}px 96px;
      width: 100%;
    }
    .ProseMirror h1 {
      border-bottom: 1px solid ${mobileColors.border};
      color: ${mobileColors.text};
      font-size: ${h1FontSize}px;
      font-weight: 700;
      line-height: ${h1LineHeight}px;
      margin: 0 0 ${desktopEditorParity.h1MarginBottom}px;
      padding-bottom: ${desktopEditorParity.h1PaddingBottom}px;
    }
    .ProseMirror h2 {
      color: ${mobileColors.text};
      font-size: ${desktopEditorParity.h2FontSize}px;
      font-weight: 700;
      line-height: ${desktopEditorParity.h2LineHeight}px;
      margin: ${desktopEditorParity.h2MarginTop}px 0 ${desktopEditorParity.h2MarginBottom}px;
    }
    .ProseMirror h3,
    .ProseMirror h4 {
      color: ${mobileColors.text};
      font-size: ${desktopEditorParity.h3FontSize}px;
      font-weight: 700;
      line-height: ${desktopEditorParity.h3LineHeight}px;
      margin: ${desktopEditorParity.h3MarginTop}px 0 ${desktopEditorParity.h3MarginBottom}px;
    }
    .ProseMirror p {
      margin: 0 0 ${desktopEditorParity.paragraphSpacing}px;
    }
    .ProseMirror blockquote {
      border-left: 3px solid ${mobileColors.primary};
      color: ${mobileColors.textMuted};
      font-style: italic;
      margin: ${desktopEditorParity.quoteMarginVertical}px 0;
      padding-left: ${desktopEditorParity.quotePaddingLeft}px;
    }
    .ProseMirror code {
      background: ${mobileColors.graySoft};
      border-radius: 4px;
      font-family: Menlo, monospace;
      font-size: ${desktopEditorParity.inlineCodeFontSize}px;
      padding: ${desktopEditorParity.inlineCodePaddingVertical}px ${desktopEditorParity.inlineCodePaddingHorizontal}px;
    }
    .ProseMirror pre {
      background: ${mobileColors.graySoft};
      border-radius: 6px;
      overflow-x: auto;
      padding: ${mobileSpace.md}px;
    }
    .ProseMirror ul,
    .ProseMirror ol {
      margin: 0 0 ${desktopEditorParity.paragraphSpacing}px;
      padding-left: ${desktopEditorParity.listIndentSize + desktopEditorParity.listPaddingLeft}px;
    }
    .ProseMirror li {
      margin: ${desktopEditorParity.listItemSpacing}px 0;
    }
    .ProseMirror hr {
      border: 0;
      border-top: ${desktopEditorParity.horizontalRuleThickness}px solid ${mobileColors.border};
      margin: ${desktopEditorParity.horizontalRuleMarginVertical}px 0;
    }
    .ProseMirror table {
      border-collapse: collapse;
      font-size: ${desktopEditorParity.tableFontSize}px;
      margin: ${mobileSpace.md}px 0;
      width: 100%;
    }
    .ProseMirror th,
    .ProseMirror td {
      border: 1px solid ${mobileColors.border};
      padding: ${desktopEditorParity.tableCellPaddingVertical}px ${desktopEditorParity.tableCellPaddingHorizontal}px;
      text-align: left;
    }
    .ProseMirror a {
      color: ${mobileColors.primary};
    }
  `
}

const nativeEditorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.editor,
  },
  richText: {
    flex: 1,
    backgroundColor: mobileColors.editor,
  },
  toolbarHost: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
})
