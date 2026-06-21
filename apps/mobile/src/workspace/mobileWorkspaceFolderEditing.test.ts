import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites } from './mobileWorkspaceEditing'
import type { MobileNote, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'

type NotePath = string

describe('mobile folder editing', () => {
  it('does not create folders over existing vault file paths', () => {
    const snapshot = snapshotWithFileEntry('Writing/Drafts')

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      name: 'Drafts',
      parentPath: 'Writing',
      type: 'createFolder',
    })

    expect(result.snapshot).toBe(snapshot)
    expect(result.writes).toEqual([])
  })

  it('does not rename folders over existing vault file paths', () => {
    const snapshot = {
      ...snapshotWithFileEntry('Research'),
      folderPaths: ['Tolaria', 'Tolaria/Mobile UI'],
    }

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      folderPath: 'Tolaria',
      name: 'Research',
      type: 'renameFolder',
    })

    expect(result.snapshot).toBe(snapshot)
    expect(result.writes).toEqual([])
  })
})

function snapshotWithFileEntry(path: NotePath): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const fileEntry = fileEntryNote(path, base.notes[0])

  return {
    ...base,
    allNotes: [fileEntry, ...base.notes],
    notes: [fileEntry, ...base.notes],
  }
}

function fileEntryNote(path: NotePath, baseNote: MobileNote): MobileNote {
  return {
    ...baseNote,
    fileKind: 'text',
    id: path,
    path,
    rawContent: 'plain=true\n',
    relationships: [],
    snippet: 'plain=true',
    title: path.split('/').at(-1) ?? path,
    type: 'File',
  }
}
