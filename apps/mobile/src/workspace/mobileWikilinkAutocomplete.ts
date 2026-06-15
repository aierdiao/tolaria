import type { MobileNote } from './mobileWorkspaceModel'
import { mobileWikilinkTargetForNote } from './mobileWikilinks'

type CursorOffset = number
type MarkdownContent = string
type WikilinkQuery = string
type WikilinkTarget = string

export type MobileWikilinkAutocompleteMatch = {
  cursor: CursorOffset
  query: WikilinkQuery
  start: CursorOffset
}

export type MobileWikilinkAutocompleteReplacement = {
  cursor: CursorOffset
  text: MarkdownContent
}

const MIN_WIKILINK_QUERY_LENGTH = 2
const MAX_WIKILINK_SUGGESTIONS = 10

export function activeMobileWikilinkQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
): MobileWikilinkAutocompleteMatch | null {
  const boundedCursor = boundedTextCursor(text, cursor)
  const beforeCursor = text.slice(0, boundedCursor)
  const triggerIndex = beforeCursor.lastIndexOf('[[')
  if (triggerIndex === -1) return null

  const query = beforeCursor.slice(triggerIndex + 2)
  if (query.includes(']') || query.includes('\n')) return null

  return {
    cursor: boundedCursor,
    query,
    start: triggerIndex,
  }
}

export function replaceActiveMobileWikilinkQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
  target: WikilinkTarget,
): MobileWikilinkAutocompleteReplacement | null {
  const match = activeMobileWikilinkQuery(text, cursor)
  if (!match) return null

  const replacement = `[[${target}]]`
  return {
    cursor: match.start + replacement.length,
    text: `${text.slice(0, match.start)}${replacement}${text.slice(match.cursor)}`,
  }
}

export function mobileWikilinkAutocompleteSuggestions(
  notes: MobileNote[],
  query: WikilinkQuery,
): MobileNote[] {
  if (query.length < MIN_WIKILINK_QUERY_LENGTH) return []

  const normalizedQuery = normalizeSearchText(query)
  return notes
    .filter((note) => !note.archived)
    .filter((note) => mobileWikilinkSearchValues(note).some((value) => normalizeSearchText(value).includes(normalizedQuery)))
    .slice(0, MAX_WIKILINK_SUGGESTIONS)
}

export function mobileWikilinkAutocompleteTarget(note: MobileNote): WikilinkTarget {
  return mobileWikilinkTargetForNote(note)
}

function mobileWikilinkSearchValues(note: MobileNote): string[] {
  return [
    note.title,
    note.type,
    note.path ?? '',
    filenameStem(note.path ?? note.id),
    ...(note.aliases ?? []),
    ...note.tags,
  ].filter(Boolean)
}

function filenameStem(path: string): string {
  return path.split('/').filter(Boolean).at(-1)?.replace(/\.[^.]+$/u, '') ?? path
}

function boundedTextCursor(text: MarkdownContent, cursor: CursorOffset): CursorOffset {
  if (!Number.isFinite(cursor)) return text.length
  return Math.max(0, Math.min(cursor, text.length))
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}
