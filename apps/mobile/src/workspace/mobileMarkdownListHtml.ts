export type MobileMarkdownListKind = 'bullet' | 'ordered' | 'task'

export type MobileMarkdownListItem = {
  checked?: boolean
  depth: number
  text: string
}

type InlineHtmlRenderer = (text: string) => string
type RenderListResult = { html: string; nextIndex: number }

export function mobileMarkdownListHtml(
  kind: MobileMarkdownListKind,
  items: MobileMarkdownListItem[],
  inlineHtml: InlineHtmlRenderer,
): string {
  if (items.length === 0) return ''
  return renderList({ depth: items[0]?.depth ?? 0, index: 0, inlineHtml, items, kind }).html
}

function renderList({
  depth,
  index,
  inlineHtml,
  items,
  kind,
}: {
  depth: number
  index: number
  inlineHtml: InlineHtmlRenderer
  items: MobileMarkdownListItem[]
  kind: MobileMarkdownListKind
}): RenderListResult {
  const chunks = [listOpenTag(kind)]
  let cursor = index

  while (cursor < items.length) {
    const item = items[cursor]
    if (!item || item.depth < depth) break
    if (item.depth > depth) {
      const child = renderList({ depth: item.depth, index: cursor, inlineHtml, items, kind })
      chunks.push(child.html)
      cursor = child.nextIndex
      continue
    }

    const child = renderChildList({ depth, index: cursor + 1, inlineHtml, items, kind })
    chunks.push(listItemHtml(kind, item, inlineHtml(item.text), child.html))
    cursor = child.nextIndex
  }

  chunks.push(listCloseTag(kind))
  return { html: chunks.join(''), nextIndex: cursor }
}

function renderChildList(options: {
  depth: number
  index: number
  inlineHtml: InlineHtmlRenderer
  items: MobileMarkdownListItem[]
  kind: MobileMarkdownListKind
}): RenderListResult {
  const nextItem = options.items[options.index]
  return nextItem && nextItem.depth > options.depth
    ? renderList({ ...options, depth: nextItem.depth })
    : { html: '', nextIndex: options.index }
}

function listOpenTag(kind: MobileMarkdownListKind): string {
  if (kind === 'ordered') return '<ol>'
  if (kind === 'task') return '<ul data-type="taskList">'
  return '<ul>'
}

function listCloseTag(kind: MobileMarkdownListKind): string {
  return kind === 'ordered' ? '</ol>' : '</ul>'
}

function listItemHtml(
  kind: MobileMarkdownListKind,
  item: MobileMarkdownListItem,
  content: string,
  children: string,
): string {
  if (kind !== 'task') return `<li><p>${content}</p>${children}</li>`

  const checkedAttr = item.checked ? 'true' : 'false'
  const inputChecked = item.checked ? ' checked="checked"' : ''
  return [
    `<li data-type="taskItem" data-checked="${checkedAttr}">`,
    `<label><input type="checkbox"${inputChecked}><span></span></label>`,
    `<div><p>${content}</p>${children}</div>`,
    '</li>',
  ].join('')
}
