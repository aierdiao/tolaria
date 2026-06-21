import { isTauri } from '../mock-tauri'
import { normalizeExternalUrl, type ExternalUrlCandidate } from './externalUrl'

type AbsoluteFilePath = string

export { isUrlValue, normalizeExternalUrl, normalizeUrl } from './externalUrl'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return ''

  const message = Reflect.get(error, 'message')
  return typeof message === 'string' ? message : ''
}

function isExternalOpenCanceledByUser(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('os error 1223') ||
    message.includes('operation was canceled by the user') ||
    message.includes('operation was cancelled by the user')
}

/** Open a URL in the system browser. Uses Tauri opener plugin in native mode, window.open in browser. */
export async function openExternalUrl(url: ExternalUrlCandidate): Promise<void> {
  const normalized = normalizeExternalUrl(url)
  if (!normalized) return

  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    try {
      await openUrl(normalized)
    } catch (error) {
      if (isExternalOpenCanceledByUser(error)) return
      throw error
    }
  } else {
    window.open(normalized, '_blank')
  }
}

/** Open a local file path with the system default app (e.g. TextEdit for .json). */
export async function openLocalFile(absolutePath: AbsoluteFilePath, vaultPath?: AbsoluteFilePath): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    const args: { path: string; vaultPath?: string } = { path: absolutePath }
    if (vaultPath) args.vaultPath = vaultPath
    await invoke('open_vault_file_external', args)
  }
}

/** Reveal a local file or folder in the system file manager. */
export async function revealLocalPath(absolutePath: AbsoluteFilePath): Promise<void> {
  if (isTauri()) {
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
    await revealItemInDir(absolutePath)
  }
}

/** Copy a local file or folder path to the system clipboard. */
export async function copyLocalPath(absolutePath: AbsoluteFilePath): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API is unavailable')
  }

  await navigator.clipboard.writeText(absolutePath)
}
