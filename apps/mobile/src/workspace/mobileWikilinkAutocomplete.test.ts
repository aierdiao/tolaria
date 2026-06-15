import { describe, expect, it } from 'vitest'
import type { MobileNote } from './mobileWorkspaceModel'
import {
  activeMobileWikilinkQuery,
  mobileWikilinkAutocompleteSuggestions,
  mobileWikilinkAutocompleteTarget,
  replaceActiveMobileWikilinkQuery,
} from './mobileWikilinkAutocomplete'

describe('mobile wikilink autocomplete', () => {
  it('detects the active unclosed wikilink query at the cursor', () => {
    expect(activeMobileWikilinkQuery('Before [[Proj after', 13)).toEqual({
      cursor: 13,
      query: 'Proj',
      start: 7,
    })
  })

  it('ignores closed and multiline wikilinks', () => {
    expect(activeMobileWikilinkQuery('[[Project]]', 11)).toBeNull()
    expect(activeMobileWikilinkQuery('[[Project\nNext', 10)).toBeNull()
  })

  it('replaces only the active query and preserves trailing text', () => {
    expect(replaceActiveMobileWikilinkQuery('See [[Proj today', 10, 'projects/alpha')).toEqual({
      cursor: 22,
      text: 'See [[projects/alpha]] today',
    })
  })

  it('matches desktop-style title, alias, filename, type, tag, and path candidates', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({
        aliases: ['Important Alpha'],
        path: 'projects/project-alpha.md',
        tags: ['Strategy'],
        title: 'Project Alpha',
        type: 'Project',
      }),
      note({ archived: true, title: 'Archived Alpha' }),
    ], 'important')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Project Alpha'])
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'a')).toEqual([])
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'str')).toHaveLength(1)
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'project-alpha')).toHaveLength(1)
  })

  it('uses the canonical vault-relative path stem as the inserted target', () => {
    expect(mobileWikilinkAutocompleteTarget(note({
      path: 'projects/project-alpha.md',
      title: 'Project Alpha',
    }))).toBe('projects/project-alpha')
  })
})

function note(overrides: Partial<MobileNote>): MobileNote {
  return {
    created: 'today',
    date: 'today',
    favorite: false,
    id: overrides.path ?? `${overrides.title ?? 'Note'}.md`,
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
