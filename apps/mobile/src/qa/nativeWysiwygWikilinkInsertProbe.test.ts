import { describe, expect, it } from 'vitest'
import {
  assertNativeWysiwygWikilinkInsertProofs,
  formatNativeWysiwygWikilinkInsertFailures,
  nativeWysiwygPersonMentionInsertProbeContent,
  nativeWysiwygPersonMentionInsertProbePayload,
  nativeWysiwygPersonMentionInsertProbeSelection,
  nativeWysiwygWikilinkInsertLogLine,
  nativeWysiwygWikilinkInsertProbeEnabled,
  nativeWysiwygWikilinkInsertProbePayload,
  nativeWysiwygWikilinkInsertProof,
  parseNativeWysiwygWikilinkInsertProofs,
} from './nativeWysiwygWikilinkInsertProbe'

describe('native WYSIWYG wikilink insert probe', () => {
  it('uses the canonical native insertion payload', () => {
    expect(nativeWysiwygWikilinkInsertProbePayload()).toEqual({
      label: 'AI Ops Guide',
      target: 'AI Ops Guide',
    })
    expect(nativeWysiwygPersonMentionInsertProbePayload()).toEqual({
      label: 'Luca',
      target: 'People/Luca',
    })
    expect(nativeWysiwygPersonMentionInsertProbeContent()).toMatchObject({
      content: [{
        content: [{ text: 'Ask @Lu', type: 'text' }],
        type: 'paragraph',
      }],
      type: 'doc',
    })
    expect(nativeWysiwygPersonMentionInsertProbeSelection()).toEqual({ from: 5, to: 8 })
  })

  it('builds a passing proof when inserted links save as desktop markdown', () => {
    expect(nativeWysiwygWikilinkInsertProof({
      content: '# Note\n\nAsk [[People/Luca|Luca]] about [[AI Ops Guide]].',
      noteId: 'note.md',
    })).toMatchObject({
      insertedPersonMentionSaved: true,
      insertedPersonMentionSourceRemoved: true,
      insertedWikilinkSaved: true,
      noteId: 'note.md',
    })
  })

  it('parses and asserts simulator log proofs', () => {
    const proof = nativeWysiwygWikilinkInsertProof({
      content: '# Note\n\nAsk [[People/Luca|Luca]] [[AI Ops Guide]] ',
      noteId: 'note.md',
    })

    expect(parseNativeWysiwygWikilinkInsertProofs(nativeWysiwygWikilinkInsertLogLine(proof))).toEqual([proof])
    expect(assertNativeWysiwygWikilinkInsertProofs([proof])).toEqual([])
  })

  it('reports missing and failed insert proofs', () => {
    expect(formatNativeWysiwygWikilinkInsertFailures(
      assertNativeWysiwygWikilinkInsertProofs([]),
    )).toContain('editor.wysiwyg.wikilinkInsert')
    expect(assertNativeWysiwygWikilinkInsertProofs([
      nativeWysiwygWikilinkInsertProof({ content: '# Note', noteId: 'note.md' }),
    ])).toEqual([{
      id: 'editor.wysiwyg.wikilinkInsert.saved',
      message: 'Native WYSIWYG picker insertion saves as desktop wikilink markdown',
    }, {
      id: 'editor.wysiwyg.wikilinkInsert.personMentionSaved',
      message: 'Native WYSIWYG person mention insertion saves as a desktop wikilink alias',
    }])
    expect(assertNativeWysiwygWikilinkInsertProofs([
      nativeWysiwygWikilinkInsertProof({
        content: '# Note\n\nAsk @Lu [[AI Ops Guide]]',
        noteId: 'note.md',
      }),
    ])).toEqual([{
      id: 'editor.wysiwyg.wikilinkInsert.personMentionSaved',
      message: 'Native WYSIWYG person mention insertion saves as a desktop wikilink alias',
    }, {
      id: 'editor.wysiwyg.wikilinkInsert.personMentionReplacement',
      message: 'Native WYSIWYG person mention insertion replaces the typed @ query',
    }])
  })

  it('detects the native QA query flag', () => {
    expect(nativeWysiwygWikilinkInsertProbeEnabled(new globalThis.URLSearchParams('wysiwygWikilinkInsertProbe=1'))).toBe(true)
    expect(nativeWysiwygWikilinkInsertProbeEnabled(new globalThis.URLSearchParams('wysiwygWikilinkInsertProbe=0'))).toBe(false)
  })
})
