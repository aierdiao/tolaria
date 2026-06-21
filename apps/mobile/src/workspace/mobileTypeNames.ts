const defaultTypeCanonicalCase = new Map([
  ['event', 'Event'],
  ['person', 'Person'],
  ['project', 'Project'],
  ['note', 'Note'],
])

export function mobileTypeNameFromSidebarLabel(
  label: string,
  typeName?: string,
): string | null {
  return canonicalizeMobileTypeName(typeName ?? singularMobileTypeLabel(label))
}

function singularMobileTypeLabel(label: string): string {
  const trimmedLabel = label.trim()
  if (trimmedLabel === 'People') return 'Person'
  if (trimmedLabel.endsWith('ies')) return `${trimmedLabel.slice(0, -3)}y`
  if (trimmedLabel.endsWith('ses') || trimmedLabel.endsWith('xes') || trimmedLabel.endsWith('ches') || trimmedLabel.endsWith('shes')) {
    return trimmedLabel.slice(0, -2)
  }
  return trimmedLabel.replace(/s$/u, '')
}

function canonicalizeMobileTypeName(type: string): string | null {
  const trimmedType = type.trim()
  if (!trimmedType) return null
  return defaultTypeCanonicalCase.get(trimmedType.toLowerCase()) ?? trimmedType
}
