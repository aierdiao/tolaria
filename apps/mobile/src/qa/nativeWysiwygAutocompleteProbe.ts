import type { NativeWysiwygInlineAutocomplete } from '../components/workspace/MobileWysiwygWikilinkBridgeModel'

type ProbeLogText = string
type ProbeLine = string

export type NativeWysiwygAutocompleteProof = {
  kind: string
  query: string
  rangeFrom: number
  rangeTo: number
}

export type NativeWysiwygAutocompleteAssertionFailure = {
  id: string
  message: string
}

export const nativeWysiwygAutocompleteLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_AUTOCOMPLETE_PROBE'

export function nativeWysiwygAutocompleteProbeContent(): object {
  return {
    content: [
      {
        content: [{ text: 'See [[AI', type: 'text' }],
        type: 'paragraph',
      },
    ],
    type: 'doc',
  }
}

export function nativeWysiwygAutocompleteProbeSelection(): { from: number; to: number } {
  return { from: 9, to: 9 }
}

export function nativeWysiwygAutocompleteProof(
  match: NativeWysiwygInlineAutocomplete | null,
): NativeWysiwygAutocompleteProof {
  return {
    kind: match?.kind ?? '',
    query: match?.query ?? '',
    rangeFrom: match?.range.from ?? -1,
    rangeTo: match?.range.to ?? -1,
  }
}

export function nativeWysiwygAutocompleteLogLine(
  proof: NativeWysiwygAutocompleteProof,
): ProbeLine {
  return `${nativeWysiwygAutocompleteLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygAutocompleteProofs(
  logText: ProbeLogText,
): NativeWysiwygAutocompleteProof[] {
  return logText
    .split('\n')
    .map(parseProofLine)
    .filter((proof): proof is NativeWysiwygAutocompleteProof => proof !== null)
}

export function assertNativeWysiwygAutocompleteProofs(
  proofs: NativeWysiwygAutocompleteProof[],
): NativeWysiwygAutocompleteAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{ id: 'editor.wysiwyg.autocomplete', message: 'Native WYSIWYG autocomplete proof was not logged' }]
  }

  return [
    proofFailure(latest.kind === 'wikilink', 'editor.wysiwyg.autocomplete.kind', 'Native WYSIWYG detects wikilink autocomplete'),
    proofFailure(latest.query === 'AI', 'editor.wysiwyg.autocomplete.query', 'Native WYSIWYG preserves the typed query'),
    proofFailure(latest.rangeFrom === 5 && latest.rangeTo === 9, 'editor.wysiwyg.autocomplete.range', 'Native WYSIWYG reports the exact replacement range'),
  ].filter((failure): failure is NativeWysiwygAutocompleteAssertionFailure => failure !== null)
}

export function formatNativeWysiwygAutocompleteFailures(
  failures: NativeWysiwygAutocompleteAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

export function nativeWysiwygAutocompleteProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygAutocompleteProbe') === '1'
}

function parseProofLine(line: ProbeLine): NativeWysiwygAutocompleteProof | null {
  const prefixIndex = line.indexOf(nativeWysiwygAutocompleteLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeWysiwygAutocompleteLogPrefix.length).trim()
  try {
    return parsedProof(JSON.parse(rawJson))
  } catch {
    return null
  }
}

function parsedProof(value: unknown): NativeWysiwygAutocompleteProof | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<NativeWysiwygAutocompleteProof>
  if (typeof candidate.kind !== 'string') return null
  if (typeof candidate.query !== 'string') return null
  if (typeof candidate.rangeFrom !== 'number') return null
  if (typeof candidate.rangeTo !== 'number') return null

  return {
    kind: candidate.kind,
    query: candidate.query,
    rangeFrom: candidate.rangeFrom,
    rangeTo: candidate.rangeTo,
  }
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWysiwygAutocompleteAssertionFailure | null {
  return passed ? null : { id, message }
}
