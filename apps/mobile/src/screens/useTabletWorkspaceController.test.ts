import { describe, expect, it } from 'vitest'
import { createViewInitialFilters } from './tabletWorkspaceViewHelpers'

describe('tablet workspace controller view helpers', () => {
  it('uses the desktop create-view dialog filter defaults', () => {
    expect(createViewInitialFilters()).toEqual({
      all: [{ field: 'type', op: 'equals', value: '' }],
    })
  })
})
