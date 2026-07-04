/**
 * Frontend mirror of the backend's paired-assets reference rewrite
 * (`src-tauri/src/vault/note_assets.rs`). After a note rename migrates
 * `<old stem>.assets/` on disk, any in-memory editor content must apply the
 * same rewrite, otherwise autosave writes the stale references back and
 * silently undoes the backend migration.
 *
 * Only link destinations are touched: the destination part of
 * `[...](...)` / `![...](...)` and the target part of `[[...]]` / `![[...]]`.
 * Plain prose is never rewritten.
 */

const ASSETS_SUFFIX = '.assets'
const SEGMENT_BOUNDARY_CHARS = new Set(['/', '\\', '<', '('])

function noteStem(notePath: string): string {
  const leaf = notePath.split(/[\\/]/u).pop() ?? notePath
  const dotIndex = leaf.lastIndexOf('.')
  return dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf
}

function percentDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Replace `oldDir/` with `newDir/` at path-segment boundaries inside a link destination. */
function replaceAssetsSegment(destination: string, oldDir: string, newDir: string): string | null {
  const decoded = percentDecode(destination)
  const needle = `${oldDir}/`

  let result = ''
  let rest = decoded
  let replaced = false
  let index = rest.indexOf(needle)
  while (index >= 0) {
    const atBoundary = index === 0 || SEGMENT_BOUNDARY_CHARS.has(rest.charAt(index - 1))
    result += rest.slice(0, index)
    result += atBoundary ? `${newDir}/` : needle
    replaced = replaced || atBoundary
    rest = rest.slice(index + needle.length)
    index = rest.indexOf(needle)
  }
  if (!replaced) return null
  return result + rest
}

function rewriteDelimited(content: string, open: string, close: string, oldDir: string, newDir: string): string {
  let result = ''
  let rest = content
  let start = rest.indexOf(open)
  while (start >= 0) {
    const bodyStart = start + open.length
    const bodyLength = rest.slice(bodyStart).indexOf(close)
    if (bodyLength < 0) break
    const body = rest.slice(bodyStart, bodyStart + bodyLength)
    const updated = body.includes('\n') ? null : replaceAssetsSegment(body, oldDir, newDir)
    result += rest.slice(0, bodyStart) + (updated ?? body)
    rest = rest.slice(bodyStart + bodyLength)
    start = rest.indexOf(open)
  }
  return result + rest
}

/**
 * Rewrite references to the old note's paired `.assets/` folder so they point
 * at the renamed note's folder. Returns the content unchanged when the note
 * stem (and therefore the paired folder name) did not change.
 */
export function rewriteAssetsDirReferences(content: string, oldNotePath: string, newNotePath: string): string {
  const oldDir = `${noteStem(oldNotePath)}${ASSETS_SUFFIX}`
  const newDir = `${noteStem(newNotePath)}${ASSETS_SUFFIX}`
  if (oldDir === newDir) return content

  const inline = rewriteDelimited(content, '](', ')', oldDir, newDir)
  return rewriteDelimited(inline, '[[', ']]', oldDir, newDir)
}
