import { describe, expect, it } from 'vitest'
import { saveMobileNoteFrontmatter } from './mobileNoteFrontmatterSave'
import { createMobileVaultConfig } from './mobileVaultConfig'
import { createMemoryMobileVaultStorage } from './mobileVaultStorage'

const vault = createVault()

describe('mobile note frontmatter save', () => {
  it('updates note frontmatter through vault storage', async () => {
    const storage = createMemoryMobileVaultStorage([
      {
        path: 'notes/workflow.md',
        content: '---\ntitle: Workflow\nprivate: true\n---\n# Workflow',
      },
    ])

    await expect(saveMobileNoteFrontmatter({
      metadata: {
        status: 'Draft',
        tags: ['mobile'],
        type: 'Project',
      },
      noteId: 'notes/workflow',
      storage,
      vault,
    })).resolves.toEqual({
      status: 'saved',
      path: 'notes/workflow.md',
    })

    await expect(storage.readMarkdownFile(vault, 'notes/workflow.md')).resolves.toBe([
      '---',
      'title: Workflow',
      'private: true',
      'type: Project',
      'status: Draft',
      'tags: [mobile]',
      '---',
      '# Workflow',
    ].join('\n'))
  })

  it('returns missing when the note file does not exist', async () => {
    const storage = createMemoryMobileVaultStorage([])

    await expect(saveMobileNoteFrontmatter({
      metadata: { type: 'Essay' },
      noteId: 'missing',
      storage,
      vault,
    })).resolves.toEqual({
      status: 'missing',
      path: 'missing.md',
    })
  })
})

function createVault() {
  const result = createMobileVaultConfig({ id: 'personal', name: 'Personal Journal' })
  if (!result.ok) {
    throw new Error(result.error)
  }

  return result.config
}
