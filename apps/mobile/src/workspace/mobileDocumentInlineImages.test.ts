import { describe, expect, it } from 'vitest'
import {
  mobileMarkdownBodyToTentapHtml,
  tiptapJsonToMobileMarkdown,
  type TiptapJsonNode,
} from './mobileDocumentContent'

describe('mobile document inline images', () => {
  const inlineImageParagraph =
    'Sword shops ![front room](https://pbs.twimg.com/media/Ev3DbyOVEAQ7BxJ.png) ![](https://pbs.twimg.com/media/Ev3DhRkUcAIh2fC.png) (View Tweet)'

  it('keeps inline markdown images editable as paragraph source until inline image editing is supported', () => {
    const html = mobileMarkdownBodyToTentapHtml(`${inlineImageParagraph}\n`)

    expect(html).toBe(`<p>${inlineImageParagraph}</p>`)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<a ')
  })

  it('keeps inline markdown image paragraphs as editable markdown source after native saves', () => {
    const document: TiptapJsonNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ text: inlineImageParagraph, type: 'text' }],
        },
      ],
    }

    expect(tiptapJsonToMobileMarkdown(document)).toBe(inlineImageParagraph)
  })
})
