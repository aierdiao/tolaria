import { describe, expect, it } from 'vitest'
import { fixtureEditorBullets, fixtureNotes, workspaceScenarioForId, workspaceScenarios } from './workspaceFixtures'

describe('workspaceFixtures', () => {
  it('keeps the tablet UI lab anchored on a selected essay note', () => {
    expect(fixtureNotes[0]).toMatchObject({
      id: 'workflow-orchestration',
      type: 'Essay',
    })
    expect(fixtureEditorBullets).toHaveLength(3)
  })

  it('exposes pressure scenarios for screenshot QA', () => {
    expect(workspaceScenarios['empty-inbox'].notes).toHaveLength(0)
    expect(workspaceScenarios['property-heavy'].notes[0].relationships[0]).toMatchObject({
      kind: 'belongsTo',
      values: ['Tolaria Mobile', 'Tablet Workspace'],
    })
    expect(workspaceScenarioForId('missing')).toBe(workspaceScenarios.default)
  })
})
