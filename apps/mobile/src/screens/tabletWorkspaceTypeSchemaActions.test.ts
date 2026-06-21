import { describe, expect, it } from 'vitest'
import { workspaceScenarios } from '../fixtures/workspaceFixtures'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import {
  addTypeSchemaPropertyFormValue,
  addTypeSchemaRelationshipFormValue,
} from './tabletWorkspaceTypeSchemaActions'

type FormUpdate = {
  key: keyof TabletReadOnlyForm
  value: TabletReadOnlyForm[keyof TabletReadOnlyForm]
}

describe('tablet workspace Type schema form actions', () => {
  it('adds Type schema properties and clears fields only after a real add', () => {
    const updates: FormUpdate[] = []

    addTypeSchemaPropertyFormValue({
      form: baseForm({
        typeSchemaPropertyName: ' Priority ',
        typeSchemaPropertyValue: '5',
      }),
      updateReadOnlyForm: (key, value) => updates.push({ key, value }),
    })

    expect(updates).toEqual([
      {
        key: 'typeSchemaProperties',
        value: [{ key: 'Priority', value: 5 }],
      },
      { key: 'typeSchemaPropertyName', value: '' },
      { key: 'typeSchemaPropertyValue', value: '' },
    ])
  })

  it('preserves Type schema property inputs when the add is a no-op', () => {
    const updates: FormUpdate[] = []

    addTypeSchemaPropertyFormValue({
      form: baseForm({
        typeSchemaPropertyName: ' ',
        typeSchemaPropertyValue: 'High',
      }),
      updateReadOnlyForm: (key, value) => updates.push({ key, value }),
    })

    expect(updates).toEqual([])
  })

  it('adds Type schema relationships and clears fields only after a real add', () => {
    const notes = workspaceScenarios.default.notes
    const updates: FormUpdate[] = []

    addTypeSchemaRelationshipFormValue({
      form: baseForm({
        typeSchemaRelationshipName: ' belongs to ',
        typeSchemaRelationshipTarget: 'How I Run an Open Source Project',
        typeSchemaRelationshipTargetRef: '',
      }),
      notes,
      sourceNote: notes[0]!,
      updateReadOnlyForm: (key, value) => updates.push({ key, value }),
    })

    expect(updates).toEqual([
      {
        key: 'typeSchemaRelationships',
        value: [{
          key: 'belongs_to',
          refs: ['[[Tolaria/Mobile UI/How I Run an Open Source Project]]'],
        }],
      },
      { key: 'typeSchemaRelationshipName', value: '' },
      { key: 'typeSchemaRelationshipTargetRef', value: '' },
      { key: 'typeSchemaRelationshipTarget', value: '' },
    ])
  })

  it('preserves Type schema relationship inputs when the add is a no-op', () => {
    const updates: FormUpdate[] = []

    addTypeSchemaRelationshipFormValue({
      form: baseForm({
        typeSchemaRelationshipName: ' ',
        typeSchemaRelationshipTarget: 'How I Run an Open Source Project',
        typeSchemaRelationshipTargetRef: '',
      }),
      notes: workspaceScenarios.default.notes,
      updateReadOnlyForm: (key, value) => updates.push({ key, value }),
    })

    expect(updates).toEqual([])
  })
})

function baseForm(overrides: Partial<TabletReadOnlyForm> = {}): TabletReadOnlyForm {
  return {
    allNotesShowImages: false,
    allNotesShowPdfs: false,
    allNotesShowUnsupported: false,
    createTitle: '',
    editingFavoriteNoteId: '',
    editingFolderPath: '',
    editingViewId: '',
    filenameStem: '',
    folderName: '',
    folderParentPath: '',
    folderPath: '',
    noteIcon: '',
    noteType: '',
    primaryDisplayProperties: [],
    primaryItemId: '',
    primaryPropertyQuery: '',
    propertyName: '',
    propertyValue: '',
    propertyValueKind: 'string',
    relationshipName: '',
    relationshipNoteRef: '',
    relationshipNoteTitle: '',
    typeDisplayProperties: [],
    typeIcon: 'file',
    typeName: 'Procedure',
    typePropertyQuery: '',
    typeRenameName: '',
    typeSchemaProperties: [],
    typeSchemaPropertyName: '',
    typeSchemaPropertyValue: '',
    typeSchemaRelationships: [],
    typeSchemaRelationshipName: '',
    typeSchemaRelationshipTarget: '',
    typeSchemaRelationshipTargetRef: '',
    typeSectionLabel: '',
    typeSort: '',
    typeTemplate: '',
    typeTone: 'gray',
    typeVisible: true,
    viewDisplayProperties: [],
    viewFilters: { all: [] },
    viewIcon: '',
    viewName: '',
    viewPropertyQuery: '',
    viewSort: '',
    viewTone: null,
    ...overrides,
  }
}
