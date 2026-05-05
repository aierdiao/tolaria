import { splitFrontmatter } from '@tolaria/markdown'

export type MobileNoteFrontmatter = {
  date?: string
  icon?: string
  status?: string
  tags: string[]
  type?: string
}

export function readMobileNoteFrontmatter(content: string): MobileNoteFrontmatter {
  const [frontmatter] = splitFrontmatter(content)
  const lines = frontmatterLines(frontmatter)

  return {
    date: readScalarField({ key: 'date', lines }),
    icon: readScalarField({ key: 'icon', lines }),
    status: readScalarField({ key: 'status', lines }),
    tags: readTags(lines),
    type: readScalarField({ key: 'type', lines }),
  }
}

function readScalarField({
  key,
  lines,
}: {
  key: string
  lines: string[]
}) {
  const value = readRawField({ key, lines })
  return value && !value.startsWith('[') ? unquote(value) : undefined
}

function readTags(lines: string[]) {
  const value = readRawField({ key: 'tags', lines })
  return value?.startsWith('[') ? readInlineList(value) : []
}

function readRawField({
  key,
  lines,
}: {
  key: string
  lines: string[]
}) {
  const prefix = `${key}:`
  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim()
}

function readInlineList(value: string) {
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter(Boolean)
}

function frontmatterLines(frontmatter: string) {
  return frontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== '---')
}

function unquote(value: string) {
  return value.replace(/^['"]|['"]$/g, '')
}
