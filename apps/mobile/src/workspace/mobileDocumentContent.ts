import {
  parseLocalVaultDocument,
  serializeLocalVaultFrontmatterScalar,
  type LocalVaultFrontmatter,
  type LocalVaultFrontmatterValue,
} from './localVaultFrontmatter'
import type { MobileEditorBlock, MobileEditorInline, MobileNote } from './mobileWorkspaceModel'

type MarkdownContent = string
type MarkdownBody = string
type CodeLanguage = string
type FrontmatterKey = string
type HtmlSnippet = string
type LinkLabel = string
type MarkdownLine = string
type MarkdownLines = MarkdownLine[]
type MarkdownTableCell = string
type NoteTitleText = string
type PlainText = string
type ReadHtmlBlockResult = { html: HtmlSnippet; nextIndex: number }
type ReadParagraphResult = { nextIndex: number; text: PlainText }
type UrlText = string
type WikilinkTarget = string

export type TiptapJsonMark = {
  attrs?: Record<string, unknown>
  type?: string
}

export type TiptapJsonNode = {
  attrs?: Record<string, unknown>
  content?: TiptapJsonNode[]
  marks?: TiptapJsonMark[]
  text?: string
  type?: string
}

type ListKind = 'bullet' | 'ordered' | 'task'

const WIKILINK_HREF_PREFIX = 'tolaria://wikilink/'

type MobileEditableDocumentSource = Pick<MobileNote, 'editorBlocks' | 'rawContent' | 'title'> & {
  editorBullets?: string[]
}

export function mobileNoteEditableContent(note: MobileEditableDocumentSource): MarkdownContent {
  if (note.rawContent !== undefined) return note.rawContent

  const blocks = [
    optionalTitleHeading(note.title),
    mobileEditorBlocksToMarkdown(note.editorBlocks ?? []),
    mobileFallbackBulletsToMarkdown(note.editorBullets ?? []),
  ].filter(Boolean)

  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : ''
}

export function mobileDocumentBody(content: MarkdownContent): MarkdownBody {
  return parseLocalVaultDocument(content).body
}

export function mobileDocumentWithBody(
  content: MarkdownContent,
  body: MarkdownBody,
): MarkdownContent {
  const document = parseLocalVaultDocument(content)
  return serializeMobileDocument(document.frontmatter, body)
}

export function mobileMarkdownBodyToTentapHtml(body: MarkdownBody): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index += 1
      continue
    }

    const block = readHtmlBlock(lines, index) ?? readParagraphHtml(lines, index)
    blocks.push(block.html)
    index = block.nextIndex
  }

  return blocks.join('\n')
}

export function tiptapJsonToMobileMarkdown(node: unknown): MarkdownBody {
  if (!isTiptapJsonNode(node)) return ''
  return serializeBlockChildren(node.content ?? []).trimEnd()
}

function serializeMobileDocument(
  frontmatter: LocalVaultFrontmatter,
  body: MarkdownBody,
): MarkdownContent {
  const entries = Object.entries(frontmatter).filter(([, value]) => value !== null && value !== undefined)
  if (entries.length === 0) return body

  const frontmatterText = entries
    .map(([key, value]) => serializeFrontmatterEntry(key, value))
    .join('\n')

  return `---\n${frontmatterText}\n---\n${body}`
}

function serializeFrontmatterEntry(key: FrontmatterKey, value: LocalVaultFrontmatterValue): string {
  if (Array.isArray(value)) {
    return `${key}:\n${value.map((item) => `  - ${serializeLocalVaultFrontmatterScalar(item)}`).join('\n')}`
  }

  return `${key}: ${serializeLocalVaultFrontmatterScalar(value)}`
}

function optionalTitleHeading(title: NoteTitleText): string {
  const text = title.trim()
  return text ? `# ${escapeMarkdownLine(text)}` : ''
}

function mobileEditorBlocksToMarkdown(blocks: MobileEditorBlock[]): string {
  return blocks.map(mobileEditorBlockToMarkdown).filter(Boolean).join('\n\n')
}

function mobileEditorBlockToMarkdown(block: MobileEditorBlock): string {
  return editorBlockMarkdownSerializers[block.kind](block as never)
}

const editorBlockMarkdownSerializers = {
  paragraph: (block: Extract<MobileEditorBlock, { kind: 'paragraph' }>) => mobileEditorInlineToMarkdown(block.content),
  heading: (block: Extract<MobileEditorBlock, { kind: 'heading' }>) => `${'#'.repeat(block.level)} ${escapeMarkdownLine(block.text)}`,
  bullets: (block: Extract<MobileEditorBlock, { kind: 'bullets' }>) => block.items.map((item) => `${listIndent(item.depth)}- ${mobileEditorInlineToMarkdown(item.content)}`).join('\n'),
  orderedList: (block: Extract<MobileEditorBlock, { kind: 'orderedList' }>) => block.items.map((item) => `${listIndent(item.depth)}${item.marker} ${mobileEditorInlineToMarkdown(item.content)}`).join('\n'),
  tasks: (block: Extract<MobileEditorBlock, { kind: 'tasks' }>) => block.items.map((item) => `${listIndent(item.depth)}- [${item.checked ? 'x' : ' '}] ${mobileEditorInlineToMarkdown(item.content)}`).join('\n'),
  quote: (block: Extract<MobileEditorBlock, { kind: 'quote' }>) => `> ${mobileEditorInlineToMarkdown(block.content)}`,
  codeBlock: (block: Extract<MobileEditorBlock, { kind: 'codeBlock' }>) => codeBlockToMarkdown(block.code, block.language ?? null),
  divider: () => '---',
  table: (block: Extract<MobileEditorBlock, { kind: 'table' }>) => tableBlockToMarkdown(block.headers, block.rows),
} satisfies Record<MobileEditorBlock['kind'], (block: never) => string>

function mobileFallbackBulletsToMarkdown(bullets: MarkdownLines): string {
  return bullets.map((bullet) => `- ${escapeMarkdownLine(bullet)}`).join('\n')
}

function mobileEditorInlineToMarkdown(content: MobileEditorInline[]): string {
  return content.map(inlineSegmentToMarkdown).join('')
}

function inlineSegmentToMarkdown(segment: MobileEditorInline): string {
  let text = escapeInlineMarkdown(segment.text)
  if (segment.wikilinkTarget) text = wikilinkToMarkdown(segment.wikilinkTarget, segment.text)
  if (segment.linkHref) text = `[${escapeLinkLabel(segment.text)}](${segment.linkHref})`
  if (segment.code) text = `\`${segment.text.replaceAll('`', '\\`')}\``
  if (segment.bold) text = `**${text}**`
  if (segment.italic) text = `*${text}*`
  if (segment.strike) text = `~~${text}~~`
  return text
}

function wikilinkToMarkdown(target: WikilinkTarget, label: LinkLabel): string {
  return target === label ? `[[${target}]]` : `[[${target}|${label}]]`
}

function listIndent(depth: number | undefined): string {
  return '  '.repeat(depth ?? 0)
}

function codeBlockToMarkdown(code: PlainText, language: CodeLanguage | null): string {
  return `\`\`\`${language ?? ''}\n${code}\n\`\`\``
}

function tableBlockToMarkdown(headers: MarkdownTableCell[], rows: MarkdownTableCell[][]): string {
  return [
    `| ${headers.map(escapeTableCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(' | ')} |`),
  ].join('\n')
}

function escapeMarkdownLine(text: PlainText): string {
  return text.replace(/\r?\n/gu, ' ')
}

function escapeInlineMarkdown(text: PlainText): string {
  return text.replaceAll('\\', '\\\\')
}

function escapeLinkLabel(text: LinkLabel): string {
  return text.replaceAll('[', '\\[').replaceAll(']', '\\]')
}

function escapeTableCell(text: MarkdownTableCell): string {
  return escapeMarkdownLine(text).replaceAll('|', '\\|')
}

function readCodeBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const opening = lines[startIndex]?.match(/^```\s*([A-Za-z0-9_-]+)?\s*$/)
  if (!opening) return null

  const codeLines: string[] = []
  let index = startIndex + 1
  while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
    codeLines.push(lines[index] ?? '')
    index += 1
  }

  const language = opening[1] ? ` data-language="${escapeAttribute(opening[1])}"` : ''
  return {
    html: `<pre><code${language}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
    nextIndex: index < lines.length ? index + 1 : index,
  }
}

const htmlBlockReaders = [
  readCodeBlock,
  readTable,
  readHorizontalRule,
  readHeading,
  readQuote,
  readList,
]

function readHtmlBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  for (const reader of htmlBlockReaders) {
    const block = reader(lines, startIndex)
    if (block) return block
  }

  return null
}

function readTable(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const header = lines[startIndex]
  const divider = lines[startIndex + 1]
  if (!header || !divider || !isMarkdownTableDivider(divider)) return null

  const tableLines: string[] = [header, divider]
  let index = startIndex + 2
  while (index < lines.length && lines[index]?.includes('|')) {
    tableLines.push(lines[index] ?? '')
    index += 1
  }

  return { html: `<p>${tableLines.map(escapeHtml).join('<br>')}</p>`, nextIndex: index }
}

function readHorizontalRule(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  return isHorizontalRule(lines[startIndex] ?? '') ? { html: '<hr>', nextIndex: startIndex + 1 } : null
}

function readHeading(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const heading = lines[startIndex]?.match(/^(#{1,6})\s+(.+)$/)
  if (!heading) return null

  const level = heading[1].length
  return { html: `<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`, nextIndex: startIndex + 1 }
}

function readQuote(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const quoteLines: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const match = lines[index]?.match(/^>\s?(.*)$/)
    if (!match) break
    quoteLines.push(match[1])
    index += 1
  }

  if (quoteLines.length === 0) return null
  return {
    html: `<blockquote><p>${inlineMarkdownToHtml(quoteLines.join(' '))}</p></blockquote>`,
    nextIndex: index,
  }
}

function readList(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const first = listLine(lines[startIndex] ?? '')
  if (!first) return null

  const items: Array<{ checked?: boolean; text: string }> = []
  let index = startIndex
  const kind: ListKind = first.kind

  while (index < lines.length) {
    const current = listLine(lines[index] ?? '')
    if (!current || current.kind !== kind) break
    items.push({ checked: current.checked, text: current.text })
    index += 1
  }

  if (kind === 'task') {
    return {
      html: `<ul data-type="taskList">${items.map((item) => taskListItemHtml(item.text, item.checked === true)).join('')}</ul>`,
      nextIndex: index,
    }
  }

  const tag = kind === 'ordered' ? 'ol' : 'ul'
  return {
    html: `<${tag}>${items.map((item) => `<li><p>${inlineMarkdownToHtml(item.text)}</p></li>`).join('')}</${tag}>`,
    nextIndex: index,
  }
}

function readParagraph(lines: MarkdownLines, startIndex: number): ReadParagraphResult {
  const paragraph: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim() || isBlockStart(lines, index)) break
    paragraph.push(line.trim())
    index += 1
  }

  return { text: paragraph.join(' '), nextIndex: index }
}

function readParagraphHtml(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult {
  const paragraph = readParagraph(lines, startIndex)
  return { html: `<p>${inlineMarkdownToHtml(paragraph.text)}</p>`, nextIndex: paragraph.nextIndex }
}

function isBlockStart(lines: MarkdownLines, index: number): boolean {
  const line = lines[index] ?? ''
  if (/^```\s*/.test(line)) return true
  if (/^(#{1,6})\s+/.test(line)) return true
  if (/^>\s?/.test(line)) return true
  if (isHorizontalRule(line)) return true
  if (listLine(line)) return true
  return Boolean(lines[index + 1] && isMarkdownTableDivider(lines[index + 1] ?? ''))
}

function taskListItemHtml(text: PlainText, checked: boolean): string {
  const checkedAttr = checked ? 'true' : 'false'
  const inputChecked = checked ? ' checked="checked"' : ''
  return [
    `<li data-type="taskItem" data-checked="${checkedAttr}">`,
    `<label><input type="checkbox"${inputChecked}><span></span></label>`,
    `<div><p>${inlineMarkdownToHtml(text)}</p></div>`,
    '</li>',
  ].join('')
}

function listLine(line: MarkdownLine): { checked?: boolean; kind: ListKind; text: PlainText } | null {
  const task = line.match(/^\s*[-*+]\s+\[([ xX])]\s+(.+)$/)
  if (task) return { checked: task[1].toLowerCase() === 'x', kind: 'task', text: task[2] }

  const bullet = line.match(/^\s*[-*+]\s+(.+)$/)
  if (bullet) return { kind: 'bullet', text: bullet[1] }

  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
  if (ordered) return { kind: 'ordered', text: ordered[1] }

  return null
}

function isHorizontalRule(line: MarkdownLine): boolean {
  return /^[-*_]{3,}$/.test(line.trim())
}

function isMarkdownTableDivider(line: MarkdownLine): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function inlineMarkdownToHtml(markdown: MarkdownLine): string {
  return linkifyInlineMarkdown(escapeHtml(markdown))
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
}

function linkifyInlineMarkdown(markdown: MarkdownLine): string {
  return markdown
    .replace(/\[\[([^\]|]+)\|([^\]]+)]]/g, (_match, target: WikilinkTarget, display: LinkLabel) => (
      wikilinkHtml(target, display)
    ))
    .replace(/\[\[([^\]]+)]]/g, (_match, target: WikilinkTarget) => wikilinkHtml(target, target))
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: LinkLabel, href: UrlText) => (
      `<a href="${escapeAttribute(href)}">${label}</a>`
    ))
}

function wikilinkHtml(target: WikilinkTarget, display: LinkLabel): string {
  const href = `${WIKILINK_HREF_PREFIX}${encodeURIComponent(unescapeHtml(target))}`
  return `<a href="${href}">${display}</a>`
}

function serializeBlockChildren(nodes: TiptapJsonNode[]): MarkdownBody {
  return nodes
    .map((node) => serializeBlockNode(node))
    .filter((block) => block.length > 0)
    .join('\n\n')
}

function serializeBlockNode(node: TiptapJsonNode): MarkdownBody {
  const serializer = node.type ? blockNodeSerializers[node.type] : undefined
  return serializer ? serializer(node) : serializeBlockChildren(node.content ?? [])
}

const blockNodeSerializers: Record<string, (node: TiptapJsonNode) => MarkdownBody> = {
  paragraph: (node) => serializeInlineChildren(node.content ?? []),
  heading: (node) => `${'#'.repeat(headingLevel(node))} ${serializeInlineChildren(node.content ?? [])}`.trimEnd(),
  bulletList: (node) => serializeList(node, 'bullet'),
  orderedList: (node) => serializeList(node, 'ordered'),
  taskList: (node) => serializeList(node, 'task'),
  blockquote: (node) => prefixLines(serializeBlockChildren(node.content ?? []), '> '),
  codeBlock: codeBlockMarkdown,
  horizontalRule: () => '---',
  image: imageMarkdown,
  table: tableMarkdown,
}

function serializeInlineChildren(nodes: TiptapJsonNode[]): string {
  return nodes.map((node) => serializeInlineNode(node)).join('')
}

function serializeInlineNode(node: TiptapJsonNode): string {
  if (node.type === 'text') return applyMarks(node.text ?? '', node.marks ?? [])
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'image') return imageMarkdown(node)
  return serializeInlineChildren(node.content ?? [])
}

function serializeList(node: TiptapJsonNode, kind: ListKind): MarkdownBody {
  const start = numberAttr(node.attrs?.start) ?? 1
  return (node.content ?? []).map((item, index) => {
    if (kind === 'task') {
      const checked = item.attrs?.checked === true ? 'x' : ' '
      return `- [${checked}] ${serializeListItem(item)}`
    }

    const marker = kind === 'ordered' ? `${start + index}.` : '-'
    return `${marker} ${serializeListItem(item)}`
  }).join('\n')
}

function serializeListItem(item: TiptapJsonNode): string {
  const blocks = item.content ?? []
  const [first, ...rest] = blocks
  const firstText = first ? serializeBlockNode(first) : ''
  const nested = rest.map((block) => indentLines(serializeBlockNode(block), '  ')).filter(Boolean)
  return [firstText, ...nested].filter(Boolean).join('\n')
}

function tableMarkdown(node: TiptapJsonNode): MarkdownBody {
  const rows = (node.content ?? []).map((row) => (
    (row.content ?? []).map((cell) => serializeInlineChildren(cell.content ?? []))
  ))
  if (rows.length === 0) return ''

  const [header, ...body] = rows
  const divider = header.map(() => '---')
  return [header, divider, ...body]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')
}

function codeBlockMarkdown(node: TiptapJsonNode): MarkdownBody {
  const language = typeof node.attrs?.language === 'string' ? node.attrs.language : ''
  return `\`\`\`${language}\n${plainText(node.content ?? [])}\n\`\`\``
}

function imageMarkdown(node: TiptapJsonNode): MarkdownBody {
  const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
  const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
  return src ? `![${alt}](${src})` : ''
}

function applyMarks(text: PlainText, marks: TiptapJsonMark[]): string {
  return marks.reduce((current, mark) => applyMark(current, mark), text)
}

function applyMark(text: PlainText, mark: TiptapJsonMark): string {
  if (mark.type === 'code') return `\`${text.replace(/`/g, '\\`')}\``
  if (mark.type === 'bold') return `**${text}**`
  if (mark.type === 'italic') return `*${text}*`
  if (mark.type === 'strike') return `~~${text}~~`
  if (mark.type === 'link') return linkMarkdown(text, mark.attrs)
  return text
}

function linkMarkdown(text: LinkLabel, attrs: Record<string, unknown> | undefined): string {
  const href = typeof attrs?.href === 'string' ? attrs.href : ''
  if (!href) return text
  if (href.startsWith(WIKILINK_HREF_PREFIX)) {
    return `[[${decodeURIComponent(href.slice(WIKILINK_HREF_PREFIX.length))}|${text}]]`
  }
  return `[${text}](${href})`
}

function plainText(nodes: TiptapJsonNode[]): string {
  return nodes.map((node) => (
    node.type === 'text' ? node.text ?? '' : plainText(node.content ?? [])
  )).join('')
}

function headingLevel(node: TiptapJsonNode): number {
  const level = numberAttr(node.attrs?.level)
  if (!level) return 1
  return Math.max(1, Math.min(6, level))
}

function numberAttr(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function prefixLines(text: PlainText, prefix: MarkdownLine): string {
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n')
}

function indentLines(text: PlainText, indent: MarkdownLine): string {
  return text.split('\n').map((line) => `${indent}${line}`).join('\n')
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
  if (!value || typeof value !== 'object') return false
  const candidate = value as TiptapJsonNode
  return typeof candidate.type === 'string' || Array.isArray(candidate.content)
}

function escapeHtml(value: PlainText): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function unescapeHtml(value: PlainText): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

function escapeAttribute(value: UrlText): string {
  return escapeHtml(value)
}
