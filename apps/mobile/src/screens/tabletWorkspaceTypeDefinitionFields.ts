import type { MobileTypeDefinitions } from '../workspace/mobileWorkspaceModel'
import {
  typeSchemaPropertiesForForm,
  typeSchemaRelationshipsForForm,
} from '../workspace/mobileTypeDefinitionSchema'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'

export type ReadOnlyFormField = {
  [Key in keyof TabletReadOnlyForm]: { key: Key; value: TabletReadOnlyForm[Key] }
}[keyof TabletReadOnlyForm]

export function typeDefinitionFields({
  definition,
  label,
  typeName,
}: {
  definition: MobileTypeDefinitions[string] | undefined
  label: string
  typeName: string
}): ReadOnlyFormField[] {
  return [
    { key: 'typeDisplayProperties', value: definition?.listPropertiesDisplay ?? [] },
    { key: 'typeName', value: typeName },
    { key: 'typePropertyQuery', value: '' },
    { key: 'typeSchemaProperties', value: typeSchemaPropertiesForForm(definition) },
    { key: 'typeSchemaPropertyName', value: '' },
    { key: 'typeSchemaPropertyValue', value: '' },
    { key: 'typeSchemaRelationships', value: typeSchemaRelationshipsForForm(definition) },
    { key: 'typeSchemaRelationshipName', value: '' },
    { key: 'typeSchemaRelationshipTargetRef', value: '' },
    { key: 'typeSchemaRelationshipTarget', value: '' },
    { key: 'typeSectionLabel', value: definition?.label ?? label },
    { key: 'typeRenameName', value: typeName },
    { key: 'typeSort', value: definition?.sort ?? '' },
    { key: 'typeTemplate', value: definition?.template ?? '' },
    { key: 'typeIcon', value: definition?.icon ?? 'file' },
    { key: 'typeTone', value: definition?.color ?? definition?.tone ?? 'gray' },
    { key: 'typeVisible', value: definition?.visible !== false },
  ]
}
