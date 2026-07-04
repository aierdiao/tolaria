import type { ComponentType, CSSProperties, MouseEvent as ReactMouseEvent, MouseEventHandler, ReactNode, SVGAttributes } from 'react'
import type { VaultEntry, NoteStatus } from '../types'
import { cn } from '@/lib/utils'
import {
  Wrench, Flask, Target, ArrowsClockwise, CircleNotch,
  Users, CalendarBlank, Tag, FileText, StackSimple,
  File, FileDashed, FilePdf, FolderOpen, ImageSquare, ListChecks, SpeakerHigh, Video, WarningCircle,
} from '@phosphor-icons/react'
import { getTypeColor, getTypeLightColor } from '../utils/typeColors'
import { resolveIcon } from '../utils/iconRegistry'
import { getDisplayDate } from '../utils/noteListHelpers'
import { formatTimestampForDateDisplay } from '../utils/dateDisplay'
import { filePreviewKind, type FilePreviewKind } from '../utils/filePreview'
import { NoteTitleIcon } from './NoteTitleIcon'
import { PropertyChips } from './note-item/PropertyChips'
import { ChangeNoteContent } from './note-item/ChangeNoteContent'
import { workspaceForEntry } from '../utils/workspaces'
import { WorkspaceInitialsBadge } from './WorkspaceInitialsBadge'
import { useDateDisplayFormat } from '../hooks/useAppPreferences'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const TYPE_ICON_MAP: Record<string, ComponentType<SVGAttributes<SVGSVGElement>>> = {
  Project: Wrench,
  Experiment: Flask,
  Responsibility: Target,
  Procedure: ArrowsClockwise,
  Person: Users,
  Event: CalendarBlank,
  Topic: Tag,
  Type: StackSimple,
}

// eslint-disable-next-line react-refresh/only-export-components -- utility co-located with component
export function getTypeIcon(isA: string | null, customIcon?: string | null): ComponentType<SVGAttributes<SVGSVGElement>> {
  if (customIcon) return resolveIcon(customIcon)
  return (isA && (Reflect.get(TYPE_ICON_MAP, isA) as ComponentType<SVGAttributes<SVGSVGElement>> | undefined)) || FileText
}

type VisibleNoteStatus = Exclude<NoteStatus, 'clean'>

const NOTE_STATUS_DOT: Record<VisibleNoteStatus, { color: string; testId: string; title: string }> = {
  pendingSave: { color: 'var(--accent-green)', testId: 'pending-save-indicator', title: 'Saving to disk…' },
  unsaved: { color: 'var(--accent-green)', testId: 'unsaved-indicator', title: 'Saving to disk…' },
  new: { color: 'var(--accent-green)', testId: 'new-indicator', title: 'New (uncommitted)' },
  modified: { color: 'var(--accent-orange)', testId: 'modified-indicator', title: 'Modified (uncommitted)' },
}

function hasStatusDot(noteStatus: NoteStatus): noteStatus is VisibleNoteStatus {
  return noteStatus !== 'clean'
}

function StatusDot({ noteStatus }: { noteStatus: VisibleNoteStatus }) {
  const dot = Reflect.get(NOTE_STATUS_DOT, noteStatus) as { color: string; testId: string; title: string }
  return (
    <span
      className="mr-1.5 inline-block align-middle"
      style={{ width: 6, height: 6, borderRadius: '50%', background: dot.color, verticalAlign: 'middle' }}
      data-testid={dot.testId}
      title={dot.title}
    />
  )
}

function StateBadge({ archived }: { archived: boolean }) {
  if (archived) {
    return (
      <span className="ml-1.5 inline-block align-middle text-muted-foreground" style={{ fontSize: 9, fontWeight: 500, background: 'var(--muted)', borderRadius: 4, padding: '1px 4px', verticalAlign: 'middle' }}>
        ARCHIVED
      </span>
    )
  }
  return null
}

function WorkspaceBadge({ entry, allEntries }: { entry: VaultEntry; allEntries: VaultEntry[] }) {
  const workspace = workspaceForEntry(entry)
  const hasMultipleWorkspaces = new Set(allEntries.map((candidate) => candidate.workspace?.alias).filter(Boolean)).size > 1
  if (!workspace || !hasMultipleWorkspaces) return null
  return <WorkspaceInitialsBadge workspace={workspace} className="-mr-1.5" testId="workspace-badge" />
}

type NoteItemVisualState = {
  isUnavailableBinary: boolean
  isSelected: boolean
  isMultiSelected: boolean
  isHighlighted: boolean
}

type NoteItemRowState = 'binary' | 'multiSelected' | 'selected' | 'highlighted' | 'default'

type NoteItemSurfaceProps = {
  className: string
  style: CSSProperties
  onClick: MouseEventHandler<HTMLDivElement>
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  onMouseEnter?: () => void
  title?: string
  testId?: string
}

const NOTE_ITEM_BASE_CLASS_NAME = 'relative w-full border-0 border-b border-[var(--border)] bg-transparent p-0 text-left transition-colors'
const BINARY_NOTE_STYLE: CSSProperties = { padding: '14px 16px' }
const NOTE_ITEM_ROW_CLASS_NAMES: Record<NoteItemRowState, string> = {
  binary: 'cursor-default opacity-50',
  multiSelected: 'cursor-pointer',
  selected: 'cursor-pointer border-l-[3px]',
  highlighted: 'cursor-pointer bg-muted hover:bg-muted',
  default: 'cursor-pointer hover:bg-muted',
}

function resolveNoteItemRowState({ isUnavailableBinary, isSelected, isMultiSelected, isHighlighted }: NoteItemVisualState): NoteItemRowState {
  if (isUnavailableBinary) return 'binary'
  if (isMultiSelected) return 'multiSelected'
  if (isSelected) return 'selected'
  if (isHighlighted) return 'highlighted'
  return 'default'
}

function noteItemClassName(state: NoteItemVisualState) {
  return cn(NOTE_ITEM_BASE_CLASS_NAME, NOTE_ITEM_ROW_CLASS_NAMES[resolveNoteItemRowState(state)])
}

export type NoteAssetAuditStatus = {
  state: 'checking' | 'ok' | 'unused' | 'error'
  title: string
  count?: number
  assetDirPath?: string
  assetDirRootPath?: string
  unusedAssets?: Array<{ path: string; filename: string }>
}

const NOTE_ITEM_ACTION_BUTTON_CLASS_NAME = 'flex h-5 w-5 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-60'

function NoteAssetAuditCheckButton({
  disabled,
  status,
  onCheck,
}: {
  disabled?: boolean
  status?: NoteAssetAuditStatus
  onCheck?: (event: ReactMouseEvent) => void
}) {
  if (!onCheck) return null
  const isChecking = status?.state === 'checking'
  const color = status?.state === 'ok' && !isChecking ? 'var(--accent-green)' : undefined

  return (
    <button
      type="button"
      className={NOTE_ITEM_ACTION_BUTTON_CLASS_NAME}
      title={status?.title ?? 'Check image references'}
      aria-label={status?.title ?? 'Check image references'}
      data-testid="note-asset-audit-check-button"
      disabled={disabled || isChecking}
      onClick={onCheck}
    >
      {isChecking ? (
        <CircleNotch width={15} height={15} className="animate-spin" />
      ) : (
        <ListChecks width={15} height={15} style={{ color }} />
      )}
    </button>
  )
}

function NoteAssetAuditProblemButton({
  status,
  onOpenAssetFolder,
}: {
  status?: NoteAssetAuditStatus
  onOpenAssetFolder?: (path: string, rootPath?: string) => void
}) {
  if (status?.state !== 'unused' && status?.state !== 'error') return null

  const button = (
    <button
      type="button"
      className={NOTE_ITEM_ACTION_BUTTON_CLASS_NAME}
      title={status.title}
      aria-label={status.title}
      data-testid="note-asset-audit-status-button"
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <WarningCircle
        width={15}
        height={15}
        weight="fill"
        style={{ color: 'var(--accent-orange)' }}
      />
    </button>
  )

  if (status?.state !== 'unused' || !status.unusedAssets?.length) return button

  return (
    <Popover>
      <PopoverTrigger asChild>
        {button}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="left"
        sideOffset={8}
        className="w-72 overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border)] px-3 py-2 text-[12px] font-medium text-foreground">
          未引用图片 {status.count ?? status.unusedAssets.length}
        </div>
        {status.assetDirPath ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-muted"
            title={status.assetDirPath}
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onOpenAssetFolder?.(status.assetDirPath!, status.assetDirRootPath)
            }}
          >
            <FolderOpen width={14} height={14} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">打开附件文件夹</span>
          </button>
        ) : null}
        <div className="max-h-64 overflow-auto py-1">
          {status.unusedAssets.map((asset) => (
            <div
              key={asset.path}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-foreground"
              title={asset.path}
            >
              <ImageSquare width={14} height={14} className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{asset.filename}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NoteItemActionGroup({
  TypeIcon,
  typeColor,
  filePreviewKind,
  assetAuditStatus,
  onCheckAssets,
  onOpenAssetFolder,
}: {
  TypeIcon: ComponentType<SVGAttributes<SVGSVGElement>>
  typeColor: string
  filePreviewKind?: FilePreviewKind
  assetAuditStatus?: NoteAssetAuditStatus
  onCheckAssets?: (event: ReactMouseEvent) => void
  onOpenAssetFolder?: (path: string, rootPath?: string) => void
}) {
  return (
    <span className="ml-2 flex shrink-0 items-center gap-1.5">
      <NoteAssetAuditProblemButton status={assetAuditStatus} onOpenAssetFolder={onOpenAssetFolder} />
      <NoteAssetAuditCheckButton
        disabled={assetAuditStatus?.state === 'checking'}
        status={assetAuditStatus}
        onCheck={onCheckAssets}
      />
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <TypeIcon
          width={14}
          height={14}
          style={{ color: typeColor }}
          data-testid="type-icon"
          data-file-preview-kind={filePreviewKind}
        />
      </span>
    </span>
  )
}

function NoteSnippet({ snippet }: { snippet?: string | null }) {
  if (!snippet) return null

  return (
    <div
      className="text-[12px] leading-[1.5] text-muted-foreground"
      data-testid="note-snippet"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
    >
      {snippet}
    </div>
  )
}

function NotePropertySection({
  entry,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
}: {
  entry: VaultEntry
  displayProps: string[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: NoteItemProps['onClickNote']
}) {
  if (displayProps.length === 0) return null

  return (
    <PropertyChips
      entry={entry}
      displayProps={displayProps}
      allEntries={allEntries}
      typeEntryMap={typeEntryMap}
      onOpenNote={onClickNote}
    />
  )
}

function InteractiveNoteDetails({
  entry,
  noteStatus,
  isSelected,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
  actions,
}: {
  entry: VaultEntry
  noteStatus: NoteStatus
  isSelected: boolean
  displayProps: string[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: NoteItemProps['onClickNote']
  actions?: ReactNode
}) {
  return (
    <>
      <NoteTitleRow
        entry={entry}
        isBinary={false}
        isSelected={isSelected}
        noteStatus={noteStatus}
        actions={actions}
      />
      <NoteSnippet snippet={entry.snippet} />
      <NotePropertySection
        entry={entry}
        displayProps={displayProps}
        allEntries={allEntries}
        typeEntryMap={typeEntryMap}
        onClickNote={onClickNote}
      />
      <NoteDateRow entry={entry} allEntries={allEntries} />
    </>
  )
}

function resolveNoteTypeIcon(entry: VaultEntry, customIcon?: string | null): ComponentType<SVGAttributes<SVGSVGElement>> {
  const previewKind = filePreviewKind(entry)
  if (previewKind === 'image') return ImageSquare
  if (previewKind === 'pdf') return FilePdf
  if (previewKind === 'audio') return SpeakerHigh
  if (previewKind === 'video') return Video
  if (entry.fileKind && entry.fileKind !== 'markdown') return getFileKindIcon(entry.fileKind)
  return getTypeIcon(entry.isA, customIcon)
}

function StandardNoteContent({
  entry,
  isBinary,
  isUnavailableBinary,
  noteStatus,
  isSelected,
  typeColor,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
  assetAuditStatus,
  onCheckAssets,
  onOpenAssetFolder,
}: {
  entry: VaultEntry
  isBinary: boolean
  isUnavailableBinary: boolean
  noteStatus: NoteStatus
  isSelected: boolean
  typeColor: string
  displayProps: string[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: NoteItemProps['onClickNote']
  assetAuditStatus?: NoteAssetAuditStatus
  onCheckAssets?: NoteItemProps['onCheckAssets']
  onOpenAssetFolder?: NoteItemProps['onOpenAssetFolder']
}) {
  const te = typeEntryMap[entry.isA ?? '']
  const TypeIcon = resolveNoteTypeIcon(entry, te?.icon)
  const previewKind = filePreviewKind(entry) ?? undefined
  const hasAuditButton = !isBinary && !isUnavailableBinary && !!onCheckAssets
  const actions = (
    <NoteItemActionGroup
      TypeIcon={TypeIcon}
      typeColor={typeColor}
      filePreviewKind={previewKind}
      assetAuditStatus={assetAuditStatus}
      onCheckAssets={hasAuditButton ? (event) => {
        event.preventDefault()
        event.stopPropagation()
        onCheckAssets?.(entry)
      } : undefined}
      onOpenAssetFolder={onOpenAssetFolder}
    />
  )

  return (
    <>
      <div className="space-y-2" data-testid="note-content-stack">
        {isBinary ? (
          <NoteTitleRow
            entry={entry}
            isBinary={isUnavailableBinary}
            isSelected={isSelected}
            noteStatus={noteStatus}
            actions={actions}
          />
        ) : (
          <InteractiveNoteDetails
            entry={entry}
            noteStatus={noteStatus}
            isSelected={isSelected}
            displayProps={displayProps}
            allEntries={allEntries}
            typeEntryMap={typeEntryMap}
            onClickNote={onClickNote}
            actions={actions}
          />
        )}
      </div>
    </>
  )
}

function NoteTitleRow({
  entry,
  isBinary,
  isSelected,
  noteStatus,
  actions,
}: {
  entry: VaultEntry
  isBinary: boolean
  isSelected: boolean
  noteStatus: NoteStatus
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center gap-2" data-testid="note-title-row">
      <div className={cn('min-w-0 flex-1 truncate text-[13px]', isBinary ? 'text-muted-foreground' : 'text-foreground', isSelected && !isBinary ? 'font-semibold' : 'font-medium')}>
        {hasStatusDot(noteStatus) && !isBinary && <StatusDot noteStatus={noteStatus} />}
        <NoteTitleIcon icon={entry.icon} size={15} className="mr-1" testId="note-title-icon" />
        {entry.title}
        {!isBinary && <StateBadge archived={entry.archived} />}
      </div>
      {actions}
    </div>
  )
}

function NoteDateRow({
  entry,
  allEntries,
}: {
  entry: VaultEntry
  allEntries: VaultEntry[]
}) {
  const dateDisplayFormat = useDateDisplayFormat()
  const modifiedLabel = formatTimestampForDateDisplay(getDisplayDate(entry), dateDisplayFormat)
  const createdLabel = entry.createdAt ? `Created ${formatTimestampForDateDisplay(entry.createdAt, dateDisplayFormat)}` : null

  if (!modifiedLabel && !createdLabel) return null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[10px] text-muted-foreground" data-testid="note-date-row">
      <span>{modifiedLabel}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
        {createdLabel && <span>{createdLabel}</span>}
        <WorkspaceBadge entry={entry} allEntries={allEntries} />
      </span>
    </div>
  )
}

function noteItemStyle(isSelected: boolean, isMultiSelected: boolean, typeColor: string, typeLightColor: string): CSSProperties {
  const base: CSSProperties = { padding: isSelected && !isMultiSelected ? '14px 16px 14px 13px' : '14px 16px' }
  if (isMultiSelected) base.backgroundColor = 'color-mix(in srgb, var(--accent-blue) 10%, transparent)'
  else if (isSelected) { base.borderLeftColor = typeColor; base.backgroundColor = typeLightColor }
  return base
}

function getFileKindIcon(fileKind: string | undefined): ComponentType<SVGAttributes<SVGSVGElement>> {
  if (fileKind === 'text') return File
  if (fileKind === 'binary') return FileDashed
  return FileText
}

function resolveDisplayProps(entry: VaultEntry, typeEntryMap: Record<string, VaultEntry>, displayPropsOverride?: string[] | null): string[] {
  if (displayPropsOverride && displayPropsOverride.length > 0) return displayPropsOverride
  return typeEntryMap[entry.isA ?? '']?.listPropertiesDisplay ?? []
}

type NoteItemProps = {
  entry: VaultEntry
  isSelected: boolean
  isMultiSelected?: boolean
  isHighlighted?: boolean
  noteStatus?: NoteStatus
  /** When set, renders in Changes-view style: filename + change type icon */
  changeStatus?: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'
  typeEntryMap: Record<string, VaultEntry>
  allEntries?: VaultEntry[]
  displayPropsOverride?: string[] | null
  assetAuditStatus?: NoteAssetAuditStatus
  onCheckAssets?: (entry: VaultEntry) => void
  onOpenAssetFolder?: (path: string, rootPath?: string) => void
  onClickNote: (entry: VaultEntry, e: ReactMouseEvent) => void
  onPrefetch?: (entry: VaultEntry) => void
  onContextMenu?: (entry: VaultEntry, e: ReactMouseEvent) => void
}

function createNoteItemClickHandler(
  entry: VaultEntry,
  isUnavailableBinary: boolean,
  onClickNote: NoteItemProps['onClickNote'],
) {
  const isPropertyChipTarget = (event: ReactMouseEvent) =>
    event.target instanceof Element && event.target.closest('[data-property-chip="true"]') !== null

  if (isUnavailableBinary) {
    return (event: ReactMouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  return (event: ReactMouseEvent) => {
    if (isPropertyChipTarget(event)) return
    onClickNote(entry, event)
  }
}

function resolveNoteItemSurfaceStyle({
  isUnavailableBinary,
  isSelected,
  isMultiSelected,
  typeColor,
  typeLightColor,
}: Pick<NoteItemVisualState, 'isUnavailableBinary' | 'isSelected' | 'isMultiSelected'> & {
  typeColor: string
  typeLightColor: string
}) {
  if (isUnavailableBinary) return BINARY_NOTE_STYLE
  return noteItemStyle(isSelected, isMultiSelected, typeColor, typeLightColor)
}

function resolveNoteItemTestId({
  isMultiSelected,
  previewKind,
  isUnavailableBinary,
}: Pick<NoteItemVisualState, 'isMultiSelected' | 'isUnavailableBinary'> & {
  previewKind: FilePreviewKind | null
}) {
  if (isMultiSelected) return 'multi-selected-item'
  if (previewKind) return `${previewKind}-file-item`
  return isUnavailableBinary ? 'binary-file-item' : undefined
}

function resolveNoteItemTitle({
  previewKind,
  isUnavailableBinary,
}: Pick<NoteItemVisualState, 'isUnavailableBinary'> & {
  previewKind: FilePreviewKind | null
}) {
  if (previewKind === 'image') return 'Open image preview'
  if (previewKind === 'pdf') return 'Open PDF preview'
  if (previewKind === 'audio') return 'Open audio preview'
  if (previewKind === 'video') return 'Open video preview'
  return isUnavailableBinary ? 'Cannot open this file type' : undefined
}

function resolveNoteItemSurfaceProps({
  entry,
  isUnavailableBinary,
  previewKind,
  isSelected,
  isMultiSelected,
  isHighlighted,
  onClickNote,
  onPrefetch,
  onContextMenu,
  typeColor,
  typeLightColor,
}: NoteItemVisualState & {
  entry: VaultEntry
  previewKind: FilePreviewKind | null
  onClickNote: NoteItemProps['onClickNote']
  onPrefetch?: NoteItemProps['onPrefetch']
  onContextMenu?: NoteItemProps['onContextMenu']
  typeColor: string
  typeLightColor: string
}): NoteItemSurfaceProps {
  return {
    className: noteItemClassName({ isUnavailableBinary, isSelected, isMultiSelected, isHighlighted }),
    style: resolveNoteItemSurfaceStyle({ isUnavailableBinary, isSelected, isMultiSelected, typeColor, typeLightColor }),
    onClick: createNoteItemClickHandler(entry, isUnavailableBinary, onClickNote),
    onContextMenu: onContextMenu ? (event) => onContextMenu(entry, event) : undefined,
    onMouseEnter: entry.fileKind !== 'binary' && onPrefetch ? () => onPrefetch(entry) : undefined,
    testId: resolveNoteItemTestId({ isMultiSelected, previewKind, isUnavailableBinary }),
    title: resolveNoteItemTitle({ previewKind, isUnavailableBinary }),
  }
}

function NoteItemRow({
  surfaceProps,
  entryPath,
  isSelected,
  isMultiSelected,
  isHighlighted,
  changeStatus,
  children,
}: {
  surfaceProps: NoteItemSurfaceProps
  entryPath: string
  isSelected: boolean
  isMultiSelected: boolean
  isHighlighted: boolean
  changeStatus: NoteItemProps['changeStatus']
  children: ReactNode
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected || isMultiSelected}
      className={surfaceProps.className}
      style={surfaceProps.style}
      onClick={surfaceProps.onClick}
      onContextMenu={surfaceProps.onContextMenu}
      onMouseEnter={surfaceProps.onMouseEnter}
      data-testid={surfaceProps.testId}
      data-highlighted={isHighlighted || undefined}
      data-note-path={entryPath}
      data-change-status={changeStatus}
      title={surfaceProps.title}
    >
      {children}
    </div>
  )
}

function NoteItemContent({
  entry,
  isBinary,
  isUnavailableBinary,
  isSelected,
  noteStatus,
  changeStatus,
  typeColor,
  displayProps,
  allEntries,
  typeEntryMap,
  onClickNote,
  assetAuditStatus,
  onCheckAssets,
  onOpenAssetFolder,
}: {
  entry: VaultEntry
  isBinary: boolean
  isUnavailableBinary: boolean
  isSelected: boolean
  noteStatus: NoteStatus
  changeStatus?: NoteItemProps['changeStatus']
  typeColor: string
  displayProps: string[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  onClickNote: NoteItemProps['onClickNote']
  assetAuditStatus?: NoteAssetAuditStatus
  onCheckAssets?: NoteItemProps['onCheckAssets']
  onOpenAssetFolder?: NoteItemProps['onOpenAssetFolder']
}) {
  if (changeStatus) {
    return (
      <ChangeNoteContent
        entry={entry}
        changeStatus={changeStatus}
        isSelected={isSelected}
        isDeletedChange={changeStatus === 'deleted'}
      />
    )
  }

  return (
    <StandardNoteContent
      entry={entry}
      isBinary={isBinary}
      isUnavailableBinary={isUnavailableBinary}
      noteStatus={noteStatus}
      isSelected={isSelected}
      typeColor={typeColor}
      displayProps={displayProps}
      allEntries={allEntries}
      typeEntryMap={typeEntryMap}
      onClickNote={onClickNote}
      assetAuditStatus={assetAuditStatus}
      onCheckAssets={onCheckAssets}
      onOpenAssetFolder={onOpenAssetFolder}
    />
  )
}

export function NoteItem({ entry, isSelected, isMultiSelected = false, isHighlighted = false, noteStatus = 'clean', changeStatus, typeEntryMap, allEntries, displayPropsOverride, assetAuditStatus, onCheckAssets, onOpenAssetFolder, onClickNote, onPrefetch, onContextMenu }: NoteItemProps) {
  const isBinary = entry.fileKind === 'binary'
  const previewKind = filePreviewKind(entry)
  const isPreviewableFile = previewKind !== null
  const isUnavailableBinary = isBinary && !isPreviewableFile
  const te = typeEntryMap[entry.isA ?? '']
  const displayProps = resolveDisplayProps(entry, typeEntryMap, displayPropsOverride)
  const typeColor = isPreviewableFile ? 'var(--accent-blue)' : isBinary ? 'var(--muted-foreground)' : getTypeColor(entry.isA ?? 'Note', te?.color)
  const typeLightColor = getTypeLightColor(entry.isA ?? 'Note', te?.color)
  const surfaceProps = resolveNoteItemSurfaceProps({
    entry,
    isUnavailableBinary,
    previewKind,
    isSelected,
    isMultiSelected,
    isHighlighted,
    onClickNote,
    onPrefetch,
    onContextMenu,
    typeColor,
    typeLightColor,
  })

  return (
    <NoteItemRow
      surfaceProps={surfaceProps}
      entryPath={entry.path}
      isSelected={isSelected}
      isMultiSelected={isMultiSelected}
      isHighlighted={isHighlighted}
      changeStatus={changeStatus}
    >
      <NoteItemContent
        entry={entry}
        isBinary={isBinary}
        isUnavailableBinary={isUnavailableBinary}
        isSelected={isSelected}
        noteStatus={noteStatus}
        changeStatus={changeStatus}
        typeColor={typeColor}
        displayProps={displayProps}
        allEntries={allEntries ?? [entry]}
        typeEntryMap={typeEntryMap}
        onClickNote={onClickNote}
        assetAuditStatus={assetAuditStatus}
        onCheckAssets={onCheckAssets}
        onOpenAssetFolder={onOpenAssetFolder}
      />
    </NoteItemRow>
  )
}
