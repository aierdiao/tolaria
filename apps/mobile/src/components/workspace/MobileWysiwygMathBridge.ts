import { mergeAttributes, Node, type AnyExtension } from '@tiptap/core'
import { mobileInlineMathSource, renderMobileInlineMathHtml } from './MobileWysiwygMathHtml'

const MATH_INLINE_TYPE = 'mathInline'

type MathInlineAttributes = {
  latex: string
}
type MathInlineEditorInstance = {
  getMathInlineRenderProof: () => Promise<boolean>
}
type MathInlineHtmlAttributes = Record<string, string>
type MathInlineRenderSpec = HTMLElement | ['span', MathInlineHtmlAttributes, string]
type MathInlineBridgeMessage = MathInlineRenderProofRequest | MathInlineRenderProofResponse
type MathInlineRenderProofRequest = {
  payload: {
    messageId: string
  }
  type: 'get-math-inline-render-proof'
}
type MathInlineRenderProofResponse = {
  payload: {
    messageId: string
    rendered: boolean
  }
  type: 'send-math-inline-render-proof'
}
type PendingMathInlineRenderProof = {
  resolve: (rendered: boolean) => void
  timeout: ReturnType<typeof setTimeout>
}
type MobileMathInlineBridgeExtension = {
  clone: () => MobileMathInlineBridgeExtension
  config?: unknown
  configureCSS: (css: string) => MobileMathInlineBridgeExtension
  configureExtension: (config: unknown) => MobileMathInlineBridgeExtension
  configureTiptapExtensionsOnRunTime: (config: unknown, extendConfig: unknown) => (AnyExtension | undefined)[]
  extendExtension: (extendConfig: unknown) => MobileMathInlineBridgeExtension
  extendConfig?: unknown
  extendCSS: string
  extendEditorInstance: (sendBridgeMessage: (message: MathInlineBridgeMessage) => void) => MathInlineEditorInstance
  name: string
  onBridgeMessage: (
    editor: unknown,
    message: MathInlineBridgeMessage,
    sendMessageBack: (message: MathInlineBridgeMessage) => void,
  ) => boolean
  onEditorMessage: (message: MathInlineBridgeMessage) => boolean
  tiptapExtension: AnyExtension
}
type MobileMathInlineBridgeOptions = {
  config?: unknown
  css?: string
  extendConfig?: unknown
}

const mathInlineRenderProofs = new Map<string, PendingMathInlineRenderProof>()
const mathInlineRenderProofTimeoutMs = 1000
const mathInlineBridgeCss = `
  .math.math--inline {
    color: inherit;
    display: inline-flex;
    max-width: 100%;
    vertical-align: baseline;
    white-space: nowrap;
  }

  .math.math--inline .katex,
  .math.math--inline math {
    display: inline-flex;
    max-width: 100%;
  }
`

const MathInlineNode = Node.create({
  name: MATH_INLINE_TYPE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-latex') ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'span[data-type="mathInline"]' },
      { tag: 'span.math[data-latex]' },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const latex = mathInlineLatex(node.attrs)
    const source = mobileInlineMathSource(latex)
    const attributes = mathInlineHtmlAttributes(HTMLAttributes, {
      class: 'math math--inline',
      'data-latex': latex,
      'data-type': MATH_INLINE_TYPE,
      role: 'img',
      title: source,
    })

    return mathInlineRenderSpec(attributes, latex, source)
  },

  addNodeView() {
    return ({ node }) => {
      const latex = mathInlineLatex(node.attrs)
      const source = mobileInlineMathSource(latex)
      return {
        dom: mathInlineElement(mathInlineHtmlAttributes({}, {
          class: 'math math--inline',
          'data-latex': latex,
          'data-type': MATH_INLINE_TYPE,
          role: 'img',
          title: source,
        }), latex),
      }
    }
  },
})

function mathInlineLatex(attributes: Partial<MathInlineAttributes>): string {
  return typeof attributes.latex === 'string' ? attributes.latex : ''
}

function mathInlineHtmlAttributes(
  baseAttributes: Record<string, unknown>,
  overrides: MathInlineHtmlAttributes,
): MathInlineHtmlAttributes {
  return stringHtmlAttributes(mergeAttributes(baseAttributes, overrides) as Record<string, unknown>)
}

function stringHtmlAttributes(attributes: Record<string, unknown>): MathInlineHtmlAttributes {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
      .map(([name, value]) => [name, value === true ? '' : String(value)]),
  )
}

function mathInlineRenderSpec(
  attributes: MathInlineHtmlAttributes,
  latex: string,
  source: string,
): MathInlineRenderSpec {
  if (typeof document === 'undefined') return ['span', attributes, source]

  return mathInlineElement(attributes, latex)
}

function mathInlineElement(
  attributes: MathInlineHtmlAttributes,
  latex: string,
): HTMLElement {
  const element = document.createElement('span')
  applyHtmlAttributes(element, attributes)
  element.innerHTML = renderMobileInlineMathHtml(latex)
  return element
}

function applyHtmlAttributes(element: HTMLElement, attributes: MathInlineHtmlAttributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }
}

export const MobileMathInlineBridge = mobileMathInlineBridge()

function hasRenderedMathInline(): boolean {
  return typeof document !== 'undefined'
    && document.querySelector('.math.math--inline math') !== null
}

function mobileMathInlineBridge({
  config,
  css = mathInlineBridgeCss,
  extendConfig,
}: MobileMathInlineBridgeOptions = {}): MobileMathInlineBridgeExtension {
  return {
    clone: () => mobileMathInlineBridge({ config, css, extendConfig }),
    config,
    configureCSS: (nextCss) => mobileMathInlineBridge({ config, css: nextCss, extendConfig }),
    configureExtension: (nextConfig) => mobileMathInlineBridge({ config: nextConfig, css, extendConfig }),
    configureTiptapExtensionsOnRunTime: (runtimeConfig, runtimeExtendConfig) => (
      [configuredMathInlineNode(runtimeConfig, runtimeExtendConfig)]
    ),
    extendExtension: (nextExtendConfig) => mobileMathInlineBridge({ config, css, extendConfig: nextExtendConfig }),
    extendConfig,
    extendCSS: css,
    extendEditorInstance: (sendBridgeMessage) => ({
      getMathInlineRenderProof: () => requestMathInlineRenderProof(sendBridgeMessage),
    }),
    name: MATH_INLINE_TYPE,
    onBridgeMessage: (_editor, message, sendMessageBack) => {
      if (message.type !== 'get-math-inline-render-proof') return false

      sendMessageBack({
        payload: {
          messageId: message.payload.messageId,
          rendered: hasRenderedMathInline(),
        },
        type: 'send-math-inline-render-proof',
      })
      return true
    },
    onEditorMessage: (message) => {
      if (message.type !== 'send-math-inline-render-proof') return false

      resolveMathInlineRenderProof(message.payload.messageId, message.payload.rendered)
      return true
    },
    tiptapExtension: MathInlineNode,
  }
}

function configuredMathInlineNode(config: unknown, extendConfig: unknown): AnyExtension {
  const configuredNode = config ? MathInlineNode.configure(config) : MathInlineNode
  return extendConfig ? configuredNode.extend(extendConfig) : configuredNode
}

function requestMathInlineRenderProof(
  sendBridgeMessage: (message: MathInlineBridgeMessage) => void,
): Promise<boolean> {
  const messageId = Math.random().toString(36).substring(2)

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      mathInlineRenderProofs.delete(messageId)
      resolve(false)
    }, mathInlineRenderProofTimeoutMs)
    mathInlineRenderProofs.set(messageId, { resolve, timeout })
    sendBridgeMessage({
      payload: { messageId },
      type: 'get-math-inline-render-proof',
    })
  })
}

function resolveMathInlineRenderProof(messageId: string, rendered: boolean): void {
  const pendingProof = mathInlineRenderProofs.get(messageId)
  if (!pendingProof) return

  mathInlineRenderProofs.delete(messageId)
  clearTimeout(pendingProof.timeout)
  pendingProof.resolve(rendered)
}
