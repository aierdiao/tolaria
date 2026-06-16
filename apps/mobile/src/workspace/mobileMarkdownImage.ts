type HtmlSnippet = string
type ImageAltText = string
type MarkdownLine = string
type PlainText = string
type UrlText = string

type MobileMarkdownImage = {
  alt: ImageAltText
  src: UrlText
}

const MARKDOWN_IMAGE_LINE_PATTERN = /^\s*!\[((?:\\.|[^\]\\\n])*)\]\((<[^>\n]+>|(?:\\.|[^)\s\n])+)(?:[ \t]+"(?:\\.|[^"\\\n])*")?\)\s*$/u

export function mobileMarkdownImageHtml(line: MarkdownLine): HtmlSnippet | null {
  const image = readMobileMarkdownImage(line)
  return image ? imageHtml(image) : null
}

export function mobileImageNodeMarkdown(attrs: Record<string, unknown> | undefined): MarkdownLine {
  const src = typeof attrs?.src === 'string' ? attrs.src : ''
  const alt = typeof attrs?.alt === 'string' ? attrs.alt : ''
  return src ? `![${escapeMarkdownLabel(alt)}](${escapeMarkdownDestination(src)})` : ''
}

function readMobileMarkdownImage(line: MarkdownLine): MobileMarkdownImage | null {
  const match = line.match(MARKDOWN_IMAGE_LINE_PATTERN)
  if (!match) return null

  return {
    alt: unescapeMarkdownText(match[1] ?? ''),
    src: unescapeMarkdownDestination(match[2] ?? ''),
  }
}

function imageHtml(image: MobileMarkdownImage): HtmlSnippet {
  return `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}">`
}

function escapeMarkdownLabel(value: PlainText): PlainText {
  return value.replace(/\\/gu, '\\\\').replace(/\]/gu, '\\]')
}

function escapeMarkdownDestination(value: UrlText): UrlText {
  if (/[\s<>]/u.test(value)) return `<${value.replace(/>/gu, '%3E')}>`
  return value.replace(/\\/gu, '\\\\').replace(/\)/gu, '\\)')
}

function unescapeMarkdownText(value: PlainText): PlainText {
  return value.replace(/\\([\\\]"'])/gu, '$1')
}

function unescapeMarkdownDestination(value: UrlText): UrlText {
  const withoutAngles = value.startsWith('<') && value.endsWith('>') ? value.slice(1, -1) : value
  return withoutAngles.replace(/\\([\\()<>])/gu, '$1')
}

function escapeHtml(value: PlainText): PlainText {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
}
