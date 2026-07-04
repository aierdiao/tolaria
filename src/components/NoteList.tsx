import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { NoteListLayout } from './note-list/NoteListLayout'
import { useNoteListModel, type NoteListProps } from './note-list/useNoteListModel'
import type { NoteListMultiSelectionCommands } from './note-list/multiSelectionCommands'
import { useMultiSelectKeyboard } from './note-list/useMultiSelectKeyboard'
import { translate } from '../lib/i18n'
import { auditPerNoteAssets, type PerNoteAssetAuditResult } from '../utils/perNoteAssetAudit'
import { runGetNoteContentCommand } from '../hooks/noteContentCache'
import type { VaultEntry } from '../types'
import type { NoteAssetAuditStatus } from './NoteItem'

type NoteListInnerProps = NoteListProps & {
  onBulkOrganize?: (paths: string[]) => void
  multiSelectionCommandRef?: React.MutableRefObject<NoteListMultiSelectionCommands | null>
}

function NoteListInner({ onBulkOrganize, multiSelectionCommandRef, ...props }: NoteListInnerProps) {
  const [assetAudits, setAssetAudits] = useState<Record<string, {
    result: PerNoteAssetAuditResult
    error?: string
  }>>({})
  const [checkingAssetNotePath, setCheckingAssetNotePath] = useState<string | null>(null)

  const handleCheckAssets = useCallback(async (note: VaultEntry) => {
    if (checkingAssetNotePath || note.fileKind === 'binary') return

    setCheckingAssetNotePath(note.path)
    try {
      const content = await runGetNoteContentCommand(note.path, note.workspace?.path)
      const result = auditPerNoteAssets({
        entries: props.entries,
        note,
        content,
      })
      setAssetAudits((current) => ({ ...current, [note.path]: { result } }))
    } catch (error) {
      setAssetAudits((current) => ({
        ...current,
        [note.path]: {
          result: {
            assetDirPath: '',
            checkedAssetPaths: [],
            referencedAssetPaths: [],
            unusedAssetPaths: [],
          },
          error: error instanceof Error ? error.message : String(error),
        },
      }))
    } finally {
      setCheckingAssetNotePath(null)
    }
  }, [checkingAssetNotePath, props.entries])

  const assetAuditStatuses = useMemo<Record<string, NoteAssetAuditStatus>>(() => {
    const locale = props.locale ?? 'en'
    const statuses: Record<string, NoteAssetAuditStatus> = {}
    if (checkingAssetNotePath) {
      statuses[checkingAssetNotePath] = {
        state: 'checking',
        title: translate(locale, 'noteList.assetAudit.action'),
      }
    }
    for (const [notePath, audit] of Object.entries(assetAudits)) {
      if (notePath === checkingAssetNotePath) continue
      if (audit.error) {
        statuses[notePath] = {
          state: 'error',
          title: translate(locale, 'noteList.assetAudit.failed', { error: audit.error }),
        }
        continue
      }
      const checked = audit.result.checkedAssetPaths.length
      const unused = audit.result.unusedAssetPaths.length
      if (checked === 0) {
        statuses[notePath] = { state: 'ok', title: translate(locale, 'noteList.assetAudit.noImages') }
      } else if (unused === 0) {
        statuses[notePath] = { state: 'ok', title: translate(locale, 'noteList.assetAudit.allReferenced', { count: checked }) }
      } else {
        statuses[notePath] = {
          state: 'unused',
          count: unused,
          title: translate(locale, 'noteList.assetAudit.unusedFound', { unused, count: checked }),
        }
      }
    }
    return statuses
  }, [assetAudits, checkingAssetNotePath, props.locale])

  const model = useNoteListModel({
    ...props,
    assetAuditStatuses,
    onCheckAssets: handleCheckAssets,
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
