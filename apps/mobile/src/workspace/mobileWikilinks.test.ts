import { describe, expect, it } from 'vitest'
import type { MobileNote } from './mobileWorkspaceModel'
import { mobileNoteIdForWikilinkTarget } from './mobileWikilinks'

describe('mobile wikilink resolution', () => {
  it('resolves aliases using the same note identity candidates as desktop', () => {
    expect(mobileNoteIdForWikilinkTarget([
      note({
        aliases: ['Alpha Project'],
        id: 'projects/project-alpha.md',
        path: 'projects/project-alpha.md',
        title: 'Project A',
      }),
    ], 'alpha project')).toBe('projects/project-alpha.md')
  })
})

function note(overrides: Partial<MobileNote>): MobileNote {
  return {
    created: 'today',
    date: 'today',
    favorite: false,
    id: 'note.md',
    links: 0,
    modified: 'today',
    relationships: [],
    snippet: '',
    status: '',
    tags: [],
    title: 'Note',
    type: 'Note',
    typeTone: 'gray',
    workspace: 'Vault',
    ...overrides,
  }
}
