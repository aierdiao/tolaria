import type { MobileRelationship } from '../../workspace/mobileWorkspaceModel'

export function mobileRelationshipValueMetricSegments(
  values: MobileRelationship['values'],
): string[] {
  const seen = new Map<string, number>()

  return values.map((value, index) => {
    const base = relationshipValueBaseSegment(value) || `relationship-${index + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)

    return count === 1 ? base : `${base}-${count}`
  })
}

function relationshipValueBaseSegment(value: MobileRelationship['values'][number]) {
  const identity = value.ref ?? value.id
  return testIdSegment(identity ? `${value.title}-${identity}` : value.title)
}

function testIdSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
