import { describe, expect, it } from 'vitest'
import { rewriteAssetsDirReferences } from './noteAssetsRename'

describe('rewriteAssetsDirReferences', () => {
  it('rewrites markdown image destinations that point at the old paired assets folder', () => {
    const content = [
      '![image.png](./untitled-note-1783150835.assets/1783150842625-image.png)',
      '',
      '![image.png](./untitled-note-1783150835.assets/1783150845153-image.png)',
    ].join('\n')

    const rewritten = rewriteAssetsDirReferences(
      content,
      'D:\\DEV\\sakuhinn\\国际站阿刁\\untitled-note-1783150835.md',
      'D:\\DEV\\sakuhinn\\国际站阿刁\\test.md',
    )

    expect(rewritten).toBe([
      '![image.png](./test.assets/1783150842625-image.png)',
      '',
      '![image.png](./test.assets/1783150845153-image.png)',
    ].join('\n'))
  })

  it('rewrites percent-encoded destinations and wikilink embeds', () => {
    const encoded = '%E7%9C%9F%E6%98%AF%E6%BC%AB%E9%95%BF%E7%9A%84%E4%B8%80%E5%B9%B4%E5%95%8A.assets'
    const content = [
      `![b](./${encoded}/b.png)`,
      '![[真是漫长的一年啊.assets/other.png]]',
    ].join('\n')

    const rewritten = rewriteAssetsDirReferences(content, '/vault/真是漫长的一年啊.md', '/vault/东京.md')

    expect(rewritten).toContain('![b](./东京.assets/b.png)')
    expect(rewritten).toContain('![[东京.assets/other.png]]')
  })

  it('leaves prose mentions and unrelated folders untouched', () => {
    const content = [
      'the folder test.assets/ is mentioned in prose',
      '![i](./untest.assets/i.png)',
      '![j](attachments/test.assets.png)',
    ].join('\n')

    expect(rewriteAssetsDirReferences(content, '/vault/test.md', '/vault/tokyo.md')).toBe(content)
  })

  it('returns the content unchanged when the note stem did not change', () => {
    const content = '![i](./test.assets/i.png)'
    expect(rewriteAssetsDirReferences(content, '/vault/test.md', '/other/test.md')).toBe(content)
  })
})
