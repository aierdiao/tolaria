import type { MobileTypeDefinitions } from '../workspace/mobileWorkspaceModel'
import { mobileToneFromValue } from '../workspace/mobileWorkspaceMetadata'
import {
  normalizedDisplayProperties,
  type MobileWorkspaceEdit,
} from '../workspace/mobileWorkspaceEditing'
import { typeDefinitionSchemaPatch } from '../workspace/mobileTypeDefinitionSchema'
import {
  canRenameMobileTypeDefinition,
  mobileTypeRenameTargetName,
} from '../workspace/mobileWorkspaceTypeRename'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'

type TypeDefinitionSaveForm = Pick<
  TabletReadOnlyForm,
  | 'typeDisplayProperties'
  | 'typeIcon'
  | 'typeName'
  | 'typeRenameName'
  | 'typeSchemaProperties'
  | 'typeSchemaRelationships'
  | 'typeSectionLabel'
  | 'typeSort'
  | 'typeTemplate'
  | 'typeTone'
  | 'typeVisible'
>
type CreateTypeDefinitionEdit = Extract<MobileWorkspaceEdit, { type: 'createTypeDefinition' }>
type UpdateTypeDefinitionEdit = Extract<MobileWorkspaceEdit, { type: 'updateTypeDefinition' }>

export function createTypeDefinitionEdit(typeName: string): CreateTypeDefinitionEdit | null {
  const trimmedTypeName = typeName.trim()
  return trimmedTypeName ? { type: 'createTypeDefinition', typeName: trimmedTypeName } : null
}

export function typeDefinitionSaveEdit(
  form: TypeDefinitionSaveForm,
  typeDefinitions: MobileTypeDefinitions | undefined,
): MobileWorkspaceEdit | null {
  const typeName = form.typeName.trim()
  const nextTypeName = mobileTypeRenameTargetName(form.typeRenameName)
  if (!typeName || !nextTypeName) return null
  if (!canRenameMobileTypeDefinition(typeDefinitions, typeName, nextTypeName)) return null

  const patch = {
    color: normalizedColor(form.typeTone),
    label: typeRenamePatchLabel(form),
    icon: normalizedIcon(form.typeIcon),
    listPropertiesDisplay: normalizedDisplayProperties(form.typeDisplayProperties),
    ...typeDefinitionSchemaPatch(form.typeSchemaProperties, form.typeSchemaRelationships),
    sort: form.typeSort,
    template: form.typeTemplate,
    tone: mobileToneFromValue(form.typeTone, 'gray'),
    visible: form.typeVisible ? null : false,
  }
  const edits: MobileWorkspaceEdit[] = renamedTypeName(typeName, nextTypeName)
    ? [
      { nextTypeName, type: 'renameTypeDefinition', typeName },
      { patch, type: 'updateTypeDefinition', typeName: nextTypeName },
    ]
    : [{ patch, type: 'updateTypeDefinition', typeName }]

  return edits.length === 1 ? edits[0] : { edits, type: 'bulkEdit' }
}

export function toggleTypeVisibilityEdit(
  typeName: string,
  typeDefinitions: MobileTypeDefinitions | undefined,
): UpdateTypeDefinitionEdit | null {
  const trimmedTypeName = typeName.trim()
  const definition = trimmedTypeName ? typeDefinitions?.[trimmedTypeName] : undefined
  if (!definition) return null

  return {
    patch: { visible: definition.visible === false ? null : false },
    type: 'updateTypeDefinition',
    typeName: trimmedTypeName,
  }
}

function typeRenamePatchLabel(form: TypeDefinitionSaveForm): string | null {
  if (renamedTypeName(form.typeName, form.typeRenameName) && isDefaultTypeSectionLabel(form.typeName, form.typeSectionLabel)) {
    return null
  }

  return form.typeSectionLabel
}

function renamedTypeName(typeName: string, nextTypeName: string): boolean {
  return normalizedLabel(typeName) !== normalizedLabel(nextTypeName)
}

function isDefaultTypeSectionLabel(typeName: string, label: string): boolean {
  return normalizedLabel(label) === normalizedLabel(pluralizedTypeLabel(typeName))
}

function pluralizedTypeLabel(typeName: string): string {
  const cleanType = typeName.trim()
  if (cleanType.endsWith('s')) return cleanType
  if (cleanType.endsWith('y')) return `${cleanType.slice(0, -1)}ies`
  return `${cleanType}s`
}

function normalizedIcon(icon: string) {
  return icon.trim() || null
}

function normalizedColor(color: string) {
  return color.trim() || null
}

function normalizedLabel(value: string) {
  return value.trim().toLowerCase()
}
