import { describe, expect, it } from 'vitest'
import { createMobileEditorDocument } from './mobileEditorDocument'

describe('mobile editor document', () => {
  it('strips frontmatter and title heading from the displayed editor body', () => {
    expect(
      createMobileEditorDocument({
        title: 'Workflow Orchestration Essay',
        content: [
          '---',
          'type: Essay',
          '---',
          '',
          '# Workflow Orchestration Essay',
          '',
          'The current narrative: everything routed through an LLM.',
        ].join('\n'),
      }),
    ).toEqual({
      title: 'Workflow Orchestration Essay',
      blocks: [
        {
          id: '0:The current narrative: everything routed through an LLM.',
          kind: 'paragraph',
          text: 'The current narrative: everything routed through an LLM.',
        },
      ],
    })
  })

  it('keeps colon paragraphs instead of treating them as frontmatter', () => {
    const document = createMobileEditorDocument({
      title: 'Notes for Monday',
      content: '# Notes for Monday\n\nBottom line up front: ship the smallest useful slice.',
    })

    expect(document.blocks).toEqual([
      {
        id: '0:Bottom line up front: ship the smallest useful slice.',
        kind: 'paragraph',
        text: 'Bottom line up front: ship the smallest useful slice.',
      },
    ])
  })

  it('normalizes markdown bullets for the native placeholder surface', () => {
    const document = createMobileEditorDocument({
      title: 'Plan',
      content: '# Plan\n\n- Sidebar\n* Note list',
    })

    expect(document.blocks).toEqual([
      {
        id: '0:- Sidebar',
        kind: 'bullet',
        text: 'Sidebar',
      },
      {
        id: '1:* Note list',
        kind: 'bullet',
        text: 'Note list',
      },
    ])
  })
})
