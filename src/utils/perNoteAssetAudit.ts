import type { VaultEntry } from '../types'
import { isImagePreviewEntry } from './filePreview'

export type AssetReferenceStatus = 'referenced' | 'unused'

export interface PerNoteAssetAuditResult {
  assetDirPath: string
  checkedAssetPaths: string[]
  referencedAssetPaths: string[]
  unusedAssetPaths: string[]
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizePath(value: string): string {
  return safeDecode(value)
    .replace(/^\\\\\?\\/u, '')
    .replace(/\\/gu, '/')
    .replace(/\/+/gu, '/')
    .replace(/\/$/u, '')
}

function comparisonKey(value: string): string {
  return normalizePath(value).toLowerCase()
}

function dirname(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(0, index) : ''
}

function stem(filename: string): string {
  const leaf = normalizePath(filename).split('/').pop() ?? filename
  const index = leaf.lastIndexOf('.')
  return index > 0 ? leaf.slice(0, index) : leaf
}

export function perNoteAssetDirForNote(note: Pick<VaultEntry, 'path' | 'filename'>): string {
  const noteDir = dirname(note.path)
  const noteStem = stem(note.filename || note.path)
  return noteDir ? `${noteDir}/${noteStem}.assets` : `${noteStem}.assets`
}

function isInsideDirectory(path: string, dir: string): boolean {
  const normalizedPath = comparisonKey(path)
  const normalizedDir = comparisonKey(dir)
  return normalizedPath.startsWith(`${normalizedDir}/`)
}

function stripUrlDecorations(value: string): string {
  const hashIndex = value.indexOf('#')
  const queryIndex = value.indexOf('?')
  const cutIndexes = [hashIndex, queryIndex].filter((index) => index >= 0)
  const cutIndex = cutIndexes.length > 0 ? Math.min(...cutIndexes) : -1
  return cutIndex >= 0 ? value.slice(0, cutIndex) : value
}

function stripMarkdownTitle(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('<') && trimmed.includes('>')) {
    return trimmed.slice(1, trimmed.indexOf('>'))
  }
  const titleMatch = trimmed.match(/^(.+?)(?:\s+["'][^"']*["'])$/u)
  return (titleMatch?.[1] ?? trimmed).trim()
}

function isExternalReference(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(value) && !/^asset:/iu.test(value) && !isWindowsAbsolutePath(value)
}

function isWindowsAbsolutePath(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value)
}

function normalizeWindowsUrlPath(path: string): string {
  return /^\/[a-z]:\//iu.test(path) ? path.slice(1) : path
}

function resolveRelativePath(noteDir: string, reference: string): string {
  const stack = noteDir ? normalizePath(noteDir).split('/').filter(Boolean) : []
  for (const part of normalizePath(reference).split('/')) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  const prefix = noteDir.startsWith('/') ? '/' : ''
  return `${prefix}${stack.join('/')}`
}

function assetUrlToPath(value: string): string | null {
  if (!/^asset:/iu.test(value)) return null
  try {
    const url = new URL(value)
    return normalizeWindowsUrlPath(safeDecode(url.pathname))
  } catch {
    const marker = 'asset://localhost/'
    return value.startsWith(marker) ? normalizeWindowsUrlPath(safeDecode(value.slice(marker.length))) : null
  }
}

function referenceToComparablePath(reference: string, noteDir: string): string | null {
  const stripped = stripUrlDecorations(stripMarkdownTitle(reference))
  if (!stripped || isExternalReference(stripped)) return null
  const assetPath = assetUrlToPath(stripped)
  if (assetPath) return comparisonKey(assetPath)
  const decoded = safeDecode(stripped)
  const normalized = normalizePath(decoded)
  if (isWindowsAbsolutePath(normalized) || normalized.startsWith('/')) return comparisonKey(normalized)
  return comparisonKey(resolveRelativePath(noteDir, normalized))
}

function extractReferenceDefinitions(content: string, noteDir: string): Map<string, string> {
  const definitions = new Map<string, string>()
  const referenceDefinitionPattern = /^\s*\[([^\]]+)\]:\s*(<[^>]+>|[^\s]+)(?:\s+["'][^"']*["'])?\s*$/gmu
  for (const match of content.matchAll(referenceDefinitionPattern)) {
    const id = (match[1] ?? '').trim().toLowerCase()
    const path = referenceToComparablePath(match[2] ?? '', noteDir)
    if (id && path) definitions.set(id, path)
  }
  return definitions
}

export function extractImageReferencePaths(content: string, notePath: string): Set<string> {
  const noteDir = dirname(notePath)
  const referenced = new Set<string>()
  const markdownImagePattern = /!\[[^\]]*\]\(([^)]+)\)/gu
  const markdownReferenceImagePattern = /!\[[^\]]*\]\[([^\]]+)\]/gu
  const htmlImagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/giu
  const wikilinkImagePattern = /!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/gu
  const referenceDefinitions = extractReferenceDefinitions(content, noteDir)

  for (const match of content.matchAll(markdownImagePattern)) {
    const path = referenceToComparablePath(match[1] ?? '', noteDir)
    if (path) referenced.add(path)
  }

  for (const match of content.matchAll(markdownReferenceImagePattern)) {
    const path = referenceDefinitions.get((match[1] ?? '').trim().toLowerCase())
    if (path) referenced.add(path)
  }

  for (const match of content.matchAll(htmlImagePattern)) {
    const path = referenceToComparablePath(match[1] ?? match[2] ?? match[3] ?? '', noteDir)
    if (path) referenced.add(path)
  }

  for (const match of content.matchAll(wikilinkImagePattern)) {
    const path = referenceToComparablePath(match[1] ?? '', noteDir)
    if (path) referenced.add(path)
  }

  return referenced
}

export function auditPerNoteAssets({
  entries,
  note,
  content,
}: {
  entries: VaultEntry[]
  note: VaultEntry
  content: string
}): PerNoteAssetAuditResult {
  const assetDirPath = perNoteAssetDirForNote(note)
  const referenced = extractImageReferencePaths(content, note.path)
  const checkedAssetPaths = entries
    .filter((entry) => isImagePreviewEntry(entry) && isInsideDirectory(entry.path, assetDirPath))
    .map((entry) => entry.path)
  const referencedAssetPaths = checkedAssetPaths.filter((path) => referenced.has(comparisonKey(path)))
  const unusedAssetPaths = checkedAssetPaths.filter((path) => !referenced.has(comparisonKey(path)))

  return {
    assetDirPath,
    checkedAssetPaths,
    referencedAssetPaths,
    unusedAssetPaths,
  }
}
