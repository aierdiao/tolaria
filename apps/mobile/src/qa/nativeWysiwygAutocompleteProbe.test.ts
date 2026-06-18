import { describe, expect, it } from 'vitest'
import {
  assertNativeWysiwygAutocompleteProofs,
  formatNativeWysiwygAutocompleteFailures,
  nativeWysiwygAutocompleteLogLine,
  nativeWysiwygAutocompleteProbeContent,
  nativeWysiwygAutocompleteProbeEnabled,
  nativeWysiwygAutocompleteProbeSelection,
  nativeWysiwygAutocompleteProof,
  parseNativeWysiwygAutocompleteProofs,
} from './nativeWysiwygAutocompleteProbe'

describe('native WYSIWYG autocomplete probe', () => {
  it('uses a native document and cursor position with an active wikilink query', () => {
    expect(nativeWysiwygAutocompleteProbeContent()).toMatchObject({
      content: [{ content: [{ text: 'See [[AI' }] }],
      type: 'doc',
    })
    expect(nativeWysiwygAutocompleteProbeSelection()).toEqual({ from: 9, to: 9 })
  })

  it('parses and asserts simulator log proofs', () => {
    const proof = nativeWysiwygAutocompleteProof({
      kind: 'wikilink',
      query: 'AI',
      range: { from: 5, to: 9 },
    })

    expect(parseNativeWysiwygAutocompleteProofs(nativeWysiwygAutocompleteLogLine(proof))).toEqual([proof])
    expect(assertNativeWysiwygAutocompleteProofs([proof])).toEqual([])
  })

  it('reports missing and failed autocomplete proofs', () => {
    expect(formatNativeWysiwygAutocompleteFailures(assertNativeWysiwygAutocompleteProofs([]))).toContain('editor.wysiwyg.autocomplete')
    expect(assertNativeWysiwygAutocompleteProofs([
      nativeWysiwygAutocompleteProof(null),
    ])).toEqual([
      {
        id: 'editor.wysiwyg.autocomplete.kind',
        message: 'Native WYSIWYG detects wikilink autocomplete',
      },
      {
        id: 'editor.wysiwyg.autocomplete.query',
        message: 'Native WYSIWYG preserves the typed query',
      },
      {
        id: 'editor.wysiwyg.autocomplete.range',
        message: 'Native WYSIWYG reports the exact replacement range',
      },
    ])
  })

  it('detects the native QA query flag', () => {
    expect(nativeWysiwygAutocompleteProbeEnabled(new globalThis.URLSearchParams('wysiwygAutocompleteProbe=1'))).toBe(true)
    expect(nativeWysiwygAutocompleteProbeEnabled(new globalThis.URLSearchParams('wysiwygAutocompleteProbe=0'))).toBe(false)
  })
})
