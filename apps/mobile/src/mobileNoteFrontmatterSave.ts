import type { MobileVaultConfig } from './mobileVaultConfig'
import type { MobileVaultStorageDriver } from './mobileVaultStorage'
import {
  writeMobileNoteFrontmatter,
  type WritableMobileNoteFrontmatter,
} from './mobileNoteFrontmatterWrite'

export type MobileNoteFrontmatterSaveResult =
  | {
      status: 'saved'
      path: string
    }
  | {
      status: 'missing'
      path: string
    }

export async function saveMobileNoteFrontmatter({
  metadata,
  noteId,
  storage,
  vault,
}: {
  metadata: WritableMobileNoteFrontmatter
  noteId: string
  storage: MobileVaultStorageDriver
  vault: MobileVaultConfig
}): Promise<MobileNoteFrontmatterSaveResult> {
  const path = notePath(noteId)
  const content = await storage.readMarkdownFile(vault, path)
  if (content === null) {
    return { status: 'missing', path }
  }

  await storage.writeMarkdownFile(vault, path, writeMobileNoteFrontmatter({ content, metadata }))
  return { status: 'saved', path }
}

function notePath(noteId: string) {
  return `${noteId}.md`
}
