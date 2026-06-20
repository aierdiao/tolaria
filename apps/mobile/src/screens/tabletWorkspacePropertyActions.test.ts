import { describe, expect, it } from 'vitest'
import { addPropertyFields, editPropertyFields } from './tabletWorkspacePropertyActions'

describe('tablet workspace property actions', () => {
  it('opens prefilled add-property sheets with persisted desktop display modes', () => {
    expect(addPropertyFields('Priority', { Priority: 'status' })).toEqual([
      { key: 'propertyName', value: 'Priority' },
      { key: 'propertyValue', value: '' },
      { key: 'propertyValueKind', value: 'status' },
    ])
  })

  it('falls back to desktop key heuristics when no display mode override exists', () => {
    expect(addPropertyFields('Due date')).toContainEqual({
      key: 'propertyValueKind',
      value: 'date',
    })
  })

  it('opens edit-property sheets with persisted desktop display modes', () => {
    expect(editPropertyFields('Priority', 'High', { Priority: 'status' })).toContainEqual({
      key: 'propertyValueKind',
      value: 'status',
    })
  })
})
