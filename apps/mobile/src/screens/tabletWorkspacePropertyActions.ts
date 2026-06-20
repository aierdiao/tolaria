import type {
  MobilePropertyDisplayMode,
  MobilePropertyValue,
} from '../workspace/mobileWorkspaceModel'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import {
  mobilePropertyDisplayModeFromValueKind,
  mobilePropertyValueFormText,
  mobilePropertyValueKind,
  mobilePropertyValueKindForKey,
  parseMobilePropertyValue,
} from '../workspace/mobilePropertyValues'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'

type TabletReadOnlyFormField = {
  [Key in keyof TabletReadOnlyForm]: { key: Key; value: TabletReadOnlyForm[Key] }
}[keyof TabletReadOnlyForm]

export function editPropertyFields(
  key: string,
  value: MobilePropertyValue,
  displayModes?: Record<string, MobilePropertyDisplayMode> | null,
): TabletReadOnlyFormField[] {
  return [
    { key: 'propertyName', value: key },
    { key: 'propertyValue', value: mobilePropertyValueFormText(value) },
    { key: 'propertyValueKind', value: mobilePropertyValueKind(key, value, displayModes) },
  ]
}

export function addPropertyFields(
  key?: string,
  displayModes?: Record<string, MobilePropertyDisplayMode> | null,
): TabletReadOnlyFormField[] {
  const propertyName = key ?? ''
  return [
    { key: 'propertyName', value: propertyName },
    { key: 'propertyValue', value: '' },
    { key: 'propertyValueKind', value: mobilePropertyValueKindForKey(propertyName, 'string', displayModes) },
  ]
}

export function propertyEditFromForm(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit {
  return {
    edits: [
      {
        key: form.propertyName,
        noteId,
        type: 'updateProperty',
        value: parseMobilePropertyValue({
          key: form.propertyName,
          kind: form.propertyValueKind,
          valueText: form.propertyValue,
        }),
      },
      {
        key: form.propertyName,
        mode: mobilePropertyDisplayModeFromValueKind(form.propertyValueKind),
        type: 'updatePropertyDisplayMode',
      },
    ],
    type: 'bulkEdit',
  }
}
