import katex from 'katex'

type LatexSource = string
type HtmlSnippet = string

export function mobileInlineMathSource(latex: LatexSource): string {
  return `$${latex}$`
}

export function mobileDisplayMathSource(latex: LatexSource): string {
  return `$$\n${latex.trimEnd()}\n$$`
}

export function renderMobileInlineMathHtml(latex: LatexSource): HtmlSnippet {
  return renderMobileMathHtml(latex, false)
}

export function renderMobileDisplayMathHtml(latex: LatexSource): HtmlSnippet {
  return renderMobileMathHtml(latex, true)
}

function renderMobileMathHtml(latex: LatexSource, displayMode: boolean): HtmlSnippet {
  try {
    return katex.renderToString(latex, {
      displayMode,
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
