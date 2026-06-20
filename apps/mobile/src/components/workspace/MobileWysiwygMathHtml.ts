import katex from 'katex'

type LatexSource = string
type HtmlSnippet = string

export function mobileInlineMathSource(latex: LatexSource): string {
  return `$${latex}$`
}

export function renderMobileInlineMathHtml(latex: LatexSource): HtmlSnippet {
  try {
    return katex.renderToString(latex, {
      displayMode: false,
      output: 'mathml',
      throwOnError: false,
      trust: false,
    })
  } catch {
    return escapeHtml(latex)
  }
}

function escapeHtml(text: string): HtmlSnippet {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
