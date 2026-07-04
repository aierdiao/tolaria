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

type AssetAuditRecord = {
  result: PerNoteAssetAuditResult
  error?: string
  noteFingerprint: string
  checkedAt: number
}

const ASSET_AUDIT_STORAGE_KEY = 'tolaria.perNoteAssetAudits'
const ASSET_AUDIT_STORAGE_LIMIT = 500

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAssetAuditRecord(value: unknown): value is AssetAuditRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<AssetAuditRecord>
  return typeof record.noteFingerprint === 'string'
    && typeof record.checkedAt === 'number'
    && !!record.result
    && typeof record.result.assetDirPath === 'string'
    && isStringArray(record.result.checkedAssetPaths)
    && isStringArray(record.result.referencedAssetPaths)
    && isStringArray(record.result.unusedAssetPaths)
}

function loadStoredAssetAudits(): Record<string, AssetAuditRecord> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ASSET_AUDIT_STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, record]) => isAssetAuditRecord(record)),
    ) as Record<string, AssetAuditRecord>
  } catch {
    return {}
  }
}

function persistAssetAudits(audits: Record<string, AssetAuditRecord>): void {
  if (typeof localStorage === 'undefined') return
  try {
    const capped = Object.entries(audits)
      .sort(([, left], [, right]) => right.checkedAt - left.checkedAt)
      .slice(0, ASSET_AUDIT_STORAGE_LIMIT)
    localStorage.setItem(ASSET_AUDIT_STORAGE_KEY, JSON.stringify(Object.fromEntries(capped)))
  } catch {
    // Best-effort cache: losing it only means notes need a fresh check.
  }
}

function filenameFromPath(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() || path
}

function normalizeFolderSelectionPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function folderSelectionTargetForAssetDir(assetDirPath: string, rootPath?: string | null): { path: string; rootPath?: string } {
  const normalizedPath = assetDirPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/g, '')
  const normalizedRoot = rootPath
    ? rootPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/g, '')
    : ''

  if (!normalizedRoot) return { path: normalizeFolderSelectionPath(normalizedPath) }

  const pathKey = normalizedPath.toLowerCase()
  const rootKey = normalizedRoot.toLowerCase()
  if (pathKey === rootKey) return { path: '', rootPath: rootPath ?? undefined }
  if (pathKey.startsWith(`${rootKey}/`)) {
    return {
      path: normalizeFolderSelectionPath(normalizedPath.slice(normalizedRoot.length + 1)),
      rootPath: rootPath ?? undefined,
    }
  }
  return { path: normalizeFolderSelectionPath(normalizedPath) }
}

// Only file-byte signals: display-layer fields (snippet/title/wordCount)
// change without the content changing and would over-invalidate results.
function noteAuditFingerprint(note: VaultEntry): string {
  return `${note.modifiedAt ?? 'null'}:${note.fileSize ?? 'null'}`
}

function NoteListInner({ onBulkOrganize, multiSelectionCommandRef, ...props }: NoteListInnerProps) {
  const { entries, getNoteStatus, locale: appLocale, vaultRootPath } = props
  const [assetAudits, setAssetAudits] = useState<Record<string, AssetAuditRecord>>(loadStoredAssetAudits)
  const [checkingAssetNotePath, setCheckingAssetNotePath] = useState<string | null>(null)

  useEffect(() => {
    persistAssetAudits(assetAudits)
  }, [assetAudits])

  const handleCheckAssets = useCallback(async (note: VaultEntry) => {
    if (checkingAssetNotePath || note.fileKind === 'binary') return

    setCheckingAssetNotePath(note.path)
    try {
      const content = await runGetNoteContentCommand(note.path, note.workspace?.path)
      // Fingerprint the freshest list entry, not the click-time snapshot:
      // a stale snapshot dies on the next entries refresh even though the
      // audited content is still current.
      const latestNote = entries.find((entry) => entry.path === note.path) ?? note
      const result = auditPerNoteAssets({
        entries,
        note,
        content,
      })
      setAssetAudits((current) => ({
        ...current,
        [note.path]: {
          result,
          noteFingerprint: noteAuditFingerprint(latestNote),
          checkedAt: Date.now(),
        },
      }))
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
          noteFingerprint: noteAuditFingerprint(note),
          checkedAt: Date.now(),
        },
      }))
    } finally {
      setCheckingAssetNotePath(null)
    }
  }, [checkingAssetNotePath, entries])

  const assetAuditStatuses = useMemo<Record<string, NoteAssetAuditStatus>>(() => {
    const locale = appLocale ?? 'en'
    const statuses: Record<string, NoteAssetAuditStatus> = {}
    const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]))
    if (checkingAssetNotePath) {
      statuses[checkingAssetNotePath] = {
        state: 'checking',
        title: translate(locale, 'noteList.assetAudit.action'),
      }
    }
    for (const [notePath, audit] of Object.entries(assetAudits)) {
      if (notePath === checkingAssetNotePath) continue
      const auditNote = entriesByPath.get(notePath)
      if (!auditNote || audit.noteFingerprint !== noteAuditFingerprint(auditNote)) continue
      // Hide only while editor changes are still being written to disk.
      // Git states ('new'/'modified' = uncommitted) are unrelated to whether
      // the audited content is current — gating on them made results vanish
      // for any uncommitted note.
      const noteStatus = getNoteStatus?.(notePath) ?? 'clean'
      if (noteStatus === 'unsaved' || noteStatus === 'pendingSave') continue
      const assetDirTarget = folderSelectionTargetForAssetDir(
        audit.result.assetDirPath,
        auditNote?.workspace?.path ?? vaultRootPath ?? null,
      )
      if (audit.error) {
        statuses[notePath] = {
          state: 'error',
          title: translate(locale, 'noteList.assetAudit.failed', { error: audit.error }),
        }
        continue
      }
      const checked = audit.result.checkedAssetPaths.length
      const unused = audit.result.unusedAssetPaths.length
      for (const path of audit.result.unusedAssetPaths) {
        statuses[path] = {
          state: 'unused',
          title: translate(locale, 'noteList.assetAudit.unusedTooltip'),
        }
      }
      if (checked === 0) {
        statuses[notePath] = {
          state: 'ok',
          title: translate(locale, 'noteList.assetAudit.noImages'),
          assetDirPath: assetDirTarget.path,
          assetDirRootPath: assetDirTarget.rootPath,
        }
      } else if (unused === 0) {
        statuses[notePath] = {
          state: 'ok',
          title: translate(locale, 'noteList.assetAudit.allReferenced', { count: checked }),
          assetDirPath: assetDirTarget.path,
          assetDirRootPath: assetDirTarget.rootPath,
        }
      } else {
        statuses[notePath] = {
          state: 'unused',
          count: unused,
          title: translate(locale, 'noteList.assetAudit.unusedFound', { unused, count: checked }),
          assetDirPath: assetDirTarget.path,
          assetDirRootPath: assetDirTarget.rootPath,
          unusedAssets: audit.result.unusedAssetPaths.map((path) => ({
            path,
            filename: entriesByPath.get(path)?.filename ?? filenameFromPath(path),
          })),
        }
      }
    }
    return statuses
  }, [appLocale, assetAudits, checkingAssetNotePath, entries, getNoteStatus, vaultRootPath])

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
