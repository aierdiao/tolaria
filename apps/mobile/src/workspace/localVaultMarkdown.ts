import type { MobileEditorBlock, MobileEditorInline } from './mobileWorkspaceModel'

type MarkdownBody = string
type MarkdownLine = string
type MarkdownText = string
type NoteFilename = string
type NoteTitle = string
type SnippetText = string

const MAX_SNIPPET_LENGTH = 160
const MAX_EDITOR_BLOCKS = 10

export function deriveLocalVaultTitle({
  body,
  fallbackTitle,
  filename,
}: {
  body: MarkdownBody
  fallbackTitle: NoteTitle | null
  filename: NoteFilename
}) {
  return firstH1Title(body) ?? fallbackTitle ?? humanizeFilename(filename)
}

export function localVaultSnippet(body: MarkdownBody): SnippetText {
  const lines = body.split(/\r?\n/)
  const primary = lines.find(isPrimarySnippetLine)
  const fallback = lines.find(isFallbackSnippetLine)
  return truncateSnippet(stripMarkdown(primary ?? fallback ?? ''))
}

export function localVaultEditorBlocks(body: MarkdownBody): MobileEditorBlock[] {
  const lines = stripInitialH1(body).split(/\r?\n/)
  const blocks: MobileEditorBlock[] = []
  let index = 0

  while (index < lines.length && blocks.length < MAX_EDITOR_BLOCKS) {
    const line = lines[index].trim()

    if (!line) {
      index += 1
      continue
    }

    const table = readTable(lines, index)
    if (table) {
      blocks.push(table.block)
      index = table.nextIndex
      continue
    }

    const heading = headingBlock(line)
    if (heading) {
      blocks.push(heading)
      index += 1
      continue
    }

    const bullets = readBullets(lines, index)
    if (bullets) {
      blocks.push(bullets.block)
      index = bullets.nextIndex
      continue
    }

    const quote = quoteBlock(line)
    if (quote) {
      blocks.push(quote)
      index += 1
      continue
    }

    const paragraph = readParagraph(lines, index)
    blocks.push({ content: parseInlineText(paragraph.text), kind: 'paragraph' })
    index = paragraph.nextIndex
  }

  return blocks
}

export function localVaultEditorBullets(blocks: MobileEditorBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.kind !== 'bullets') return []
    return block.items.map((item) => item.map((segment) => segment.text).join(''))
  })
}

function firstH1Title(body: MarkdownBody): NoteTitle | null {
  const firstContentLine = body.split(/\r?\n/).find((line) => line.trim())
  const match = firstContentLine?.trim().match(/^#\s+(.+)$/)
  return match ? stripMarkdown(match[1]).trim() : null
}

function humanizeFilename(filename: NoteFilename): NoteTitle {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return withoutExtension
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function stripInitialH1(body: MarkdownBody): MarkdownBody {
  const lines = body.split(/\r?\n/)
  const firstContentIndex = lines.findIndex((line) => line.trim())
  if (firstContentIndex < 0 || !lines[firstContentIndex].trim().startsWith('# ')) return body

  return [
    ...lines.slice(0, firstContentIndex),
    ...lines.slice(firstContentIndex + 1),
  ].join('\n')
}

function isPrimarySnippetLine(line: MarkdownLine): boolean {
  const trimmed = line.trim()
  return Boolean(trimmed)
    && !trimmed.startsWith('#')
    && !trimmed.startsWith('```')
    && !/^[-*_]{3,}$/.test(trimmed)
}

function isFallbackSnippetLine(line: MarkdownLine): boolean {
  const trimmed = line.trim()
  return Boolean(trimmed) && !trimmed.startsWith('```')
}

function truncateSnippet(text: MarkdownText): SnippetText {
  if (text.length <= MAX_SNIPPET_LENGTH) return text
  return `${text.slice(0, MAX_SNIPPET_LENGTH).trimEnd()}...`
}

function stripMarkdown(text: MarkdownText): MarkdownText {
  const stripped = text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s>*-]+/g, '')
    .replace(/^\d+\.\s+/g, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return addSoftBreaks(stripped)
}

function addSoftBreaks(text: MarkdownText): MarkdownText {
  return text.replace(/\S{32,}/g, (token) => token.replace(/([/._?&=-])/g, '$1\u200B'))
}

function headingBlock(line: MarkdownLine): MobileEditorBlock | null {
  const match = line.match(/^(#{2,3})\s+(.+)$/)
  if (!match) return null

  return {
    kind: 'heading',
    level: match[1].length === 2 ? 2 : 3,
    text: stripMarkdown(match[2]),
  }
}

function quoteBlock(line: MarkdownLine): MobileEditorBlock | null {
  if (!line.startsWith('>')) return null
  return { content: parseInlineText(stripMarkdown(line)), kind: 'quote' }
}

function readBullets(
  lines: MarkdownLine[],
  startIndex: number,
): { block: Extract<MobileEditorBlock, { kind: 'bullets' }>; nextIndex: number } | null {
  const items: MobileEditorInline[][] = []
  let index = startIndex

  while (index < lines.length) {
    const match = lines[index].trim().match(/^[-*]\s+(.+)$/)
    if (!match) break
    items.push(parseInlineText(match[1]))
    index += 1
  }

  return items.length > 0 ? { block: { items, kind: 'bullets' }, nextIndex: index } : null
}

function readParagraph(lines: MarkdownLine[], startIndex: number): { nextIndex: number; text: MarkdownText } {
  const parts: string[] = []
  let index = startIndex

  while (index < lines.length && parts.length < 3) {
    const line = lines[index].trim()
    if (!line || isBlockStart(line)) break
    parts.push(line)
    index += 1
  }

  return {
    nextIndex: Math.max(index, startIndex + 1),
    text: parts.join(' '),
  }
}

function isBlockStart(line: MarkdownLine): boolean {
  return line.startsWith('#')
    || line.startsWith('>')
    || /^[-*]\s+/.test(line)
    || isPotentialTableRow(line)
}

function readTable(
  lines: MarkdownLine[],
  startIndex: number,
): { block: Extract<MobileEditorBlock, { kind: 'table' }>; nextIndex: number } | null {
  const header = lines[startIndex]
  const separator = lines[startIndex + 1]
  if (!header || !separator || !isPotentialTableRow(header) || !isMarkdownTableSeparator(separator)) {
    return null
  }

  const rows: string[][] = []
  let index = startIndex + 2
  while (index < lines.length && isPotentialTableRow(lines[index]) && rows.length < 4) {
    rows.push(splitTableCells(lines[index]))
    index += 1
  }

  return {
    block: {
      headers: splitTableCells(header),
      kind: 'table',
      rows,
    },
    nextIndex: index,
  }
}

function isPotentialTableRow(line: MarkdownLine): boolean {
  return line.trim().includes('|')
}

function isMarkdownTableSeparator(line: MarkdownLine): boolean {
  return rawTableCells(line).every((cell) => /^:?-+:?$/.test(cell))
}

function splitTableCells(line: MarkdownLine): MarkdownText[] {
  return rawTableCells(line).map((cell) => stripMarkdown(cell))
}

function rawTableCells(line: MarkdownLine): MarkdownText[] {
  return line.trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function parseInlineText(text: MarkdownText): MobileEditorInline[] {
  const segments: MobileEditorInline[] = []
  const pattern = /(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g
  let cursor = 0

  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ text: stripMarkdown(text.slice(cursor, match.index)) })
    segments.push(inlineMatch(match))
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) segments.push({ text: stripMarkdown(text.slice(cursor)) })

  return segments.filter((segment) => segment.text.length > 0)
}

function inlineMatch(match: RegExpMatchArray): MobileEditorInline {
  if (match[2]) return { code: true, text: match[2] }
  if (match[4]) return { bold: true, text: stripMarkdown(match[4]) }
  return { italic: true, text: stripMarkdown(match[6] ?? '') }
}
