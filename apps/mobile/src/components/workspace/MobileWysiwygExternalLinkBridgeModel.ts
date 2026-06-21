import type { TiptapJsonNode } from '../../workspace/mobileDocumentContent'
import type { NativeWysiwygSelection } from './MobileWysiwygWikilinkBridgeModel'

type RemoveExternalLinkInput = {
  json: unknown
  selection?: NativeWysiwygSelection
}
type RemoveResult = {
  changed: boolean
  nextPosition: number
  node: TiptapJsonNode
}

export function nativeWysiwygDocumentWithoutExternalLink({
  json,
  selection,
}: RemoveExternalLinkInput): unknown | null {
  if (!isTiptapJsonNode(json)) return null

  const result = removeExternalLinkMarks(json, {
    from: selection?.from ?? Number.NEGATIVE_INFINITY,
    to: selection?.to ?? Number.POSITIVE_INFINITY,
  }, 0)

  return result.changed ? result.node : null
}

function removeExternalLinkMarks(
  node: TiptapJsonNode,
  selection: NativeWysiwygSelection,
  position: number,
): RemoveResult {
  if (typeof node.text === 'string') return removeExternalLinkMarksFromTextNode(node, selection, position)
  if (!node.content || node.content.length === 0) {
    return {
      changed: false,
      nextPosition: position + (node.type === 'doc' ? 0 : 1),
      node,
    }
  }

  let changed = false
  let cursor = node.type === 'doc' ? position : position + 1
  const content = node.content.map((child) => {
    const result = removeExternalLinkMarks(child, selection, cursor)
    cursor = result.nextPosition
    changed = changed || result.changed
    return result.node
  })

  return {
    changed,
    nextPosition: node.type === 'doc' ? cursor : cursor + 1,
    node: changed ? { ...node, content } : node,
  }
}

function removeExternalLinkMarksFromTextNode(
  node: TiptapJsonNode,
  selection: NativeWysiwygSelection,
  position: number,
): RemoveResult {
  const textLength = node.text?.length ?? 0
  const nextPosition = position + textLength
  if (!rangesOverlap(selection, { from: position, to: nextPosition })) {
    return { changed: false, nextPosition, node }
  }

  const marks = node.marks?.filter((mark) => mark.type !== 'link')
  const changed = (marks?.length ?? 0) !== (node.marks?.length ?? 0)
  if (!changed) return { changed: false, nextPosition, node }

  return {
    changed,
    nextPosition,
    node: marks && marks.length > 0 ? { ...node, marks } : withoutMarks(node),
  }
}

function rangesOverlap(left: NativeWysiwygSelection, right: NativeWysiwygSelection): boolean {
  return left.from < right.to && right.from < left.to
}

function withoutMarks(node: TiptapJsonNode): TiptapJsonNode {
  const nextNode = { ...node }
  delete nextNode.marks
  return nextNode
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
  return Boolean(value) && typeof value === 'object'
}
