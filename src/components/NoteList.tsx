import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NoteListLayout } from './note-list/NoteListLayout'
import { useNoteListModel, type NoteListProps } from './note-list/useNoteListModel'
import type { NoteListMultiSelectionCommands } from './note-list/multiSelectionCommands'
import { useMultiSelectKeyboard } from './note-list/useMultiSelectKeyboard'
import { translate } from '../lib/i18n'
import { auditPerNoteAssets, type PerNoteAssetAuditResult } from '../utils/perNoteAssetAudit'
import { runGetNoteContentCommand } from '../hooks/noteContentCache'

type NoteListInnerProps = NoteListProps & {
  onBulkOrganize?: (paths: string[]) => void
  multiSelectionCommandRef?: React.MutableRefObject<NoteListMultiSelectionCommands | null>
}

function NoteListInner({ onBulkOrganize, multiSelectionCommandRef, ...props }: NoteListInnerProps) {
  const [assetAudit, setAssetAudit] = useState<{
    notePath: string
    result: PerNoteAssetAuditResult
    error?: string
  } | null>(null)
  const [isCheckingAssets, setIsCheckingAssets] = useState(false)

  const handleCheckAssets = useCallback(async () => {
    if (!props.selectedNote || isCheckingAssets) return

    setIsCheckingAssets(true)
    try {
      const content = await runGetNoteContentCommand(props.selectedNote.path, props.selectedNote.workspace?.path)
      const result = auditPerNoteAssets({
        entries: props.entries,
        note: props.selectedNote,
        content,
      })
      setAssetAudit({ notePath: props.selectedNote.path, result })
    } catch (error) {
      setAssetAudit({
        notePath: props.selectedNote.path,
        result: {
          assetDirPath: '',
          checkedAssetPaths: [],
          referencedAssetPaths: [],
          unusedAssetPaths: [],
        },
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsCheckingAssets(false)
    }
  }, [isCheckingAssets, props.entries, props.selectedNote])

  const assetReferenceStatuses = useMemo(() => {
    if (!assetAudit) return undefined
    return Object.fromEntries(assetAudit.result.unusedAssetPaths.map((path) => [path, 'unused' as const]))
  }, [assetAudit])

  const assetAuditMessage = useMemo(() => {
    if (!assetAudit) return null
    const locale = props.locale ?? 'en'
    if (assetAudit.error) {
      return translate(locale, 'noteList.assetAudit.failed', { error: assetAudit.error })
    }
    const checked = assetAudit.result.checkedAssetPaths.length
    const unused = assetAudit.result.unusedAssetPaths.length
    if (checked === 0) return translate(locale, 'noteList.assetAudit.noImages')
    if (unused === 0) return translate(locale, 'noteList.assetAudit.allReferenced', { count: checked })
    return translate(locale, 'noteList.assetAudit.unusedFound', { unused, count: checked })
  }, [assetAudit, props.locale])

  const model = useNoteListModel({
    ...props,
    assetReferenceStatuses,
    onCheckAssets: handleCheckAssets,
    canCheckAssets: !!props.selectedNote && props.selectedNote.fileKind !== 'binary',
    isCheckingAssets,
    assetAuditMessage,
  })

  const handleBulkOrganize = useCallback(() => {
    const paths = [...model.multiSelect.selectedPaths]
    model.multiSelect.clear()
    onBulkOrganize?.(paths)
  }, [model.multiSelect, onBulkOrganize])

  useMultiSelectKeyboard({
    multiSelect: model.multiSelect,
    isEntityView: model.isEntityView,
    onBulkOrganize: onBulkOrganize ? handleBulkOrganize : undefined,
    onBulkDelete: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
    enableActionShortcuts: !multiSelectionCommandRef,
  })

  useEffect(() => {
    if (!multiSelectionCommandRef) return

    multiSelectionCommandRef.current = {
      selectedPaths: [...model.multiSelect.selectedPaths],
      deleteSelected: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
      organizeSelected: onBulkOrganize ? handleBulkOrganize : undefined,
    }

    return () => {
      multiSelectionCommandRef.current = null
    }
  }, [
    handleBulkOrganize,
    model.handleBulkDeletePermanently,
    model.multiSelect.selectedPaths,
    multiSelectionCommandRef,
    onBulkOrganize,
    props.onBulkDeletePermanently,
  ])

  return <NoteListLayout {...model} handleBulkOrganize={onBulkOrganize ? handleBulkOrganize : undefined} />
}

export const NoteList = memo(NoteListInner)
