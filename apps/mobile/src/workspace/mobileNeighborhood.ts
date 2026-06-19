import { mobileNoteListMatchesQuery, normalizedMobileSearchQuery } from './mobileNoteSearch'
import { mobileNoteForWikilinkTarget, parseMobileWikilink } from './mobileWikilinks'
import type { MobileNote, MobileRelationship } from './mobileWorkspaceModel'

export type MobileNeighborhoodGroup = {
  id: string
  label: string
  notes: MobileNote[]
  source: MobileNeighborhoodGroupSource
}

export type MobileNeighborhoodGroupSource = 'backlinks' | 'direct' | 'instances' | 'inverse'

export type MobileNeighborhood = {
  groups: MobileNeighborhoodGroup[]
  source: MobileNote
}

const preferredInverseLabels = ['Children', 'Events', 'Referenced by'] as const

export function buildMobileNeighborhood(source: MobileNote, notes: MobileNote[]): MobileNeighborhood {
  return {
    groups: [
      ...instanceGroups(source, notes),
      ...directRelationshipGroups(source, notes),
      ...inverseRelationshipGroups(source, notes),
      ...backlinkGroups(source, notes),
    ],
    source,
  }
}

export function buildMobileInspectorReferenceGroups(source: MobileNote, notes: MobileNote[]): MobileNeighborhoodGroup[] {
  return [
    ...instanceGroups(source, notes),
    ...inverseRelationshipGroups(source, notes),
    ...backlinkGroups(source, notes),
  ]
}

export function filterMobileNeighborhood(
  neighborhood: MobileNeighborhood,
  query: string,
  displayPropertyKeys: string[] = [],
): MobileNeighborhood {
  const normalizedQuery = normalizedMobileSearchQuery(query)
  if (!normalizedQuery) return neighborhood

  return {
    ...neighborhood,
    groups: neighborhood.groups
      .map((group) => ({
        ...group,
        notes: group.notes.filter((note) => mobileNoteListMatchesQuery(note, normalizedQuery, displayPropertyKeys)),
      }))
      .filter((group) => group.notes.length > 0),
  }
}

export function flattenMobileNeighborhoodNotes(neighborhood: MobileNeighborhood | null): MobileNote[] {
  if (!neighborhood) return []

  return [
    neighborhood.source,
    ...neighborhood.groups.flatMap((group) => group.notes),
  ]
}

function instanceGroups(source: MobileNote, notes: MobileNote[]): MobileNeighborhoodGroup[] {
  if (source.type !== 'Type') return []

  return [
    relationshipGroup('Instances', notes.filter((note) => note.type === source.title && note.id !== source.id), 'instances'),
  ].filter(hasNotes)
}

function directRelationshipGroups(source: MobileNote, notes: MobileNote[]): MobileNeighborhoodGroup[] {
  return [...source.relationships]
    .filter((relationship) => relationshipKey(relationship).toLowerCase() !== 'type')
    .sort((left, right) => relationshipKey(left).localeCompare(relationshipKey(right)))
    .map((relationship) => relationshipGroup(
      relationshipLabel(relationship),
      relationship.values.flatMap((value) => noteById(notes, value.id)),
      'direct',
      source.id,
    ))
    .filter(hasNotes)
}

function inverseRelationshipGroups(source: MobileNote, notes: MobileNote[]): MobileNeighborhoodGroup[] {
  const inverseGroups = new Map<string, MobileNote[]>()

  for (const note of notes) {
    if (note.id === source.id) continue
    for (const relationship of note.relationships) {
      if (relationshipKey(relationship).toLowerCase() === 'type') continue
      if (!relationshipTargetsNote(relationship, source, notes)) continue
      appendInverseRelationship(inverseGroups, inverseRelationshipLabel(relationship, note), note)
    }
  }

  return orderInverseLabels(inverseGroups.keys()).map((label) => relationshipGroup(label, inverseGroups.get(label) ?? [], 'inverse'))
}

function backlinkGroups(source: MobileNote, notes: MobileNote[]): MobileNeighborhoodGroup[] {
  return [
    relationshipGroup('Backlinks', notes.filter((note) => noteLinksToSource(note, source, notes)), 'backlinks'),
  ].filter(hasNotes)
}

function relationshipGroup(
  label: string,
  candidates: MobileNote[],
  groupSource: MobileNeighborhoodGroupSource,
  sourceId?: string,
): MobileNeighborhoodGroup {
  return {
    id: groupId(label),
    label,
    notes: sortNotesByModified(dedupeNotes(candidates, sourceId)),
    source: groupSource,
  }
}

function hasNotes(group: MobileNeighborhoodGroup) {
  return group.notes.length > 0
}

function relationshipTargetsNote(relationship: MobileRelationship, source: MobileNote, notes: MobileNote[]) {
  return relationship.values.some((value) => {
    if (value.id === source.id) return true
    if (value.ref && mobileNoteForWikilinkTarget(notes, wikilinkTarget(value.ref))?.id === source.id) return true

    return value.title === source.title
  })
}

function noteLinksToSource(note: MobileNote, source: MobileNote, notes: MobileNote[]) {
  if (note.id === source.id) return false
  return (note.outgoingLinks ?? []).some((target) => linkTargetsSource(target, source, notes))
}

function linkTargetsSource(target: string, source: MobileNote, notes: MobileNote[]) {
  if (sourceLinkTargets(source).has(target)) return true
  if (sourceLinkTargets(source).has(target.split('/').pop() ?? '')) return true

  return mobileNoteForWikilinkTarget(notes, target)?.id === source.id
}

function sourceLinkTargets(note: MobileNote) {
  const path = note.path ?? note.id
  const filename = path.split('/').pop() ?? path
  const filenameStem = filename.replace(/\.[^.]+$/u, '')
  const relativePathStem = path.replace(/\.md$/u, '')

  return new Set([
    note.title,
    ...(note.aliases ?? []),
    filenameStem,
    relativePathStem,
  ].filter(Boolean))
}

function appendInverseRelationship(groups: Map<string, MobileNote[]>, label: string, note: MobileNote) {
  groups.set(label, [...(groups.get(label) ?? []), note])
}

function orderInverseLabels(labels: Iterable<string>) {
  const presentLabels = [...labels]
  const preferredLabels = preferredInverseLabels.filter((label) => presentLabels.includes(label))
  const customLabels = presentLabels
    .filter((label) => !preferredInverseLabels.includes(label as typeof preferredInverseLabels[number]))
    .sort((left, right) => left.localeCompare(right))

  return [...preferredLabels, ...customLabels]
}

function inverseRelationshipLabel(relationship: MobileRelationship, note: MobileNote) {
  const label = relationshipLabel(relationship)
  const normalizedLabel = label.toLowerCase()

  if (normalizedLabel === 'belongs to') return note.type === 'Event' ? 'Events' : 'Children'
  if (normalizedLabel === 'related to') return note.type === 'Event' ? 'Events' : 'Referenced by'

  return `← ${label}`
}

function relationshipLabel(relationship: MobileRelationship) {
  if (relationship.kind === 'belongsTo') return 'Belongs to'
  if (relationship.kind === 'relatedTo') return 'Related to'
  if (relationship.kind === 'has') return 'Has'

  return relationship.label ?? humanizeRelationshipKey(relationshipKey(relationship))
}

function relationshipKey(relationship: MobileRelationship) {
  return relationship.key ?? relationship.label ?? relationship.kind
}

function wikilinkTarget(value: string) {
  return parseMobileWikilink(value)?.target ?? value
}

function noteById(notes: MobileNote[], noteId: string | undefined) {
  if (!noteId) return []
  const note = notes.find((candidate) => candidate.id === noteId)
  return note ? [note] : []
}

function dedupeNotes(notes: MobileNote[], sourceId?: string) {
  const deduped = new Map<string, MobileNote>()
  for (const note of notes) {
    if (note.id === sourceId || deduped.has(note.id)) continue
    deduped.set(note.id, note)
  }

  return [...deduped.values()]
}

function sortNotesByModified(notes: MobileNote[]) {
  return [...notes].sort((left, right) => (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0))
}

function groupId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function humanizeRelationshipKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
