import type { SharingOptions } from 'expo-sharing'
import type { MobileNote } from './mobileWorkspaceModel'
import { buildMobileFilePathForNote } from './mobileNoteFilePath'

export const MOBILE_FILE_REVEAL_ATTEMPTS_GLOBAL_KEY = '__TOLARIA_MOBILE_FILE_REVEAL_ATTEMPTS__'
export const MOBILE_FILE_REVEALS_GLOBAL_KEY = '__TOLARIA_MOBILE_FILE_REVEALS__'

export type MobileFileRevealResult =
  | { ok: true; opened: boolean; path: string; shared: boolean }
  | { ok: false; reason: 'missingNote' | 'unsafePath' }

export type MobileFileRevealer = (path: string) => Promise<MobileFileRevealerResult>
export type MobileFileRevealerResult = boolean | void | {
  opened?: boolean
  shared?: boolean
}

type ExpoSharingModule = {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (url: string, options?: SharingOptions) => Promise<void>
}
type LinkingModule = {
  Linking: {
    openURL: (url: string) => Promise<unknown>
  }
}

declare const require: (moduleName: string) => unknown

export async function revealMobileNoteFile({
  note,
  revealer = revealNativeMobileFile,
  vaultRootUri,
}: {
  note: MobileNote | null
  revealer?: MobileFileRevealer
  vaultRootUri?: string | null
}): Promise<MobileFileRevealResult> {
  const result = buildMobileFilePathForNote({ note, vaultRootUri })
  if (!result.ok) return { ok: false, reason: result.error === 'missing_note' ? 'missingNote' : 'unsafePath' }

  recordGlobalValue(MOBILE_FILE_REVEAL_ATTEMPTS_GLOBAL_KEY, revealEvidence(result.path, note))
  if (isBrowserRuntime()) return { ok: true, opened: false, path: result.path, shared: false }

  const revealResult = await revealer(result.path)
  const revealed = revealedMobileFileResult(result.path, revealResult)
  recordGlobalValue(MOBILE_FILE_REVEALS_GLOBAL_KEY, revealed)
  return revealed
}

async function revealNativeMobileFile(path: string): Promise<MobileFileRevealerResult> {
  const sharing = require('expo-sharing') as ExpoSharingModule
  if (await sharing.isAvailableAsync()) {
    await sharing.shareAsync(path, { dialogTitle: fileNameFromPath(path) })
    return { opened: true, shared: true }
  }

  const { Linking } = require('react-native') as LinkingModule
  await Linking.openURL(path)
  return { opened: true, shared: false }
}

function revealedMobileFileResult(path: string, nativeResult: MobileFileRevealerResult): Extract<MobileFileRevealResult, { ok: true }> {
  if (nativeResult && typeof nativeResult === 'object') {
    return {
      ok: true,
      opened: nativeResult.opened !== false,
      path,
      shared: nativeResult.shared === true,
    }
  }

  return {
    ok: true,
    opened: nativeResult !== false,
    path,
    shared: false,
  }
}

function revealEvidence(path: string, note: MobileNote | null) {
  return {
    noteId: note?.id ?? null,
    path,
    title: note?.title ?? null,
  }
}

function fileNameFromPath(path: string): string {
  const fileName = path.split(/[/?#]/u).filter(Boolean).at(-1)
  return fileName ? decodeURIComponent(fileName) : 'note'
}

function isBrowserRuntime(): boolean {
  return typeof document !== 'undefined'
}

function recordGlobalValue(key: string, value: unknown) {
  const target = globalThis as Record<string, unknown>
  const current = target[key]
  const values = Array.isArray(current) ? current : []
  values.push(value)
  target[key] = values
}
