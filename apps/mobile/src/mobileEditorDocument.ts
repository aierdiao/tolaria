import { splitFrontmatter } from '@tolaria/markdown'

export type MobileEditorBlock = {
  id: string
  kind: 'bullet' | 'paragraph'
  text: string
}

export type MobileEditorDocument = {
  title: string
  blocks: MobileEditorBlock[]
}

export type MobileEditorDocumentInput = {
  title: string
  content: string
}

export function createMobileEditorDocument(input: MobileEditorDocumentInput): MobileEditorDocument {
  const [, body] = splitFrontmatter(input.content)

  return {
    title: input.title,
    blocks: createBlocks(body, input.title),
  }
}

function createBlocks(body: string, title: string) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isTitleHeading(line, title))
    .map(createBlock)
}

function createBlock(line: string, index: number): MobileEditorBlock {
  const bulletText = bulletContent(line)

  return {
    id: `${index}:${line}`,
    kind: bulletText ? 'bullet' : 'paragraph',
    text: bulletText ?? line,
  }
}

function bulletContent(line: string) {
  const match = /^[-*]\s+(.+)$/.exec(line)
  return match?.[1] ?? null
}

function isTitleHeading(line: string, title: string) {
  return line === `# ${title}`
}
