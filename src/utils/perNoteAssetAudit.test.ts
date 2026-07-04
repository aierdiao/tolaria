import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { auditPerNoteAssets, perNoteAssetDirForNote } from './perNoteAssetAudit'

function entry(path: string, filename = path.split('/').pop() ?? path): VaultEntry {
  return {
    path,
    filename,
    title: filename,
    isA: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 1,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: false,
    fileKind: filename.endsWith('.md') ? 'markdown' : 'binary',
  }
}

describe('per-note asset audit', () => {
  it('derives the paired assets folder for a note', () => {
    expect(perNoteAssetDirForNote(entry('/vault/国际站阿刁/测试文章1.md'))).toBe('/vault/国际站阿刁/测试文章1.assets')
  })

  it('marks images in the paired assets folder that are not referenced by the current note', () => {
    const note = entry('/vault/国际站阿刁/测试文章1.md')
    const used = entry('/vault/国际站阿刁/测试文章1.assets/1783139586089-image.png')
    const htmlUsed = entry('/vault/国际站阿刁/测试文章1.assets/html image.png')
    const unused = entry('/vault/国际站阿刁/测试文章1.assets/1783139578469-image.png')
    const otherNoteImage = entry('/vault/国际站阿刁/别的文章.assets/1783139578469-image.png')
    const content = [
      '![one](./测试文章1.assets/1783139586089-image.png)',
      '<img src="./%E6%B5%8B%E8%AF%95%E6%96%87%E7%AB%A01.assets/html%20image.png">',
    ].join('\n')

    const result = auditPerNoteAssets({
      entries: [note, used, htmlUsed, unused, otherNoteImage],
      note,
      content,
    })

    expect(result.checkedAssetPaths).toEqual([used.path, htmlUsed.path, unused.path])
    expect(result.referencedAssetPaths).toEqual([used.path, htmlUsed.path])
    expect(result.unusedAssetPaths).toEqual([unused.path])
  })

  it('matches Windows absolute paths and asset URLs', () => {
    const note = entry('C:/vault/国际站阿刁/测试文章1.md')
    const absoluteUsed = entry('C:/vault/国际站阿刁/测试文章1.assets/absolute.png')
    const assetUrlUsed = entry('C:/vault/国际站阿刁/测试文章1.assets/asset-url.png')
    const unused = entry('C:/vault/国际站阿刁/测试文章1.assets/unused.png')
    const content = [
      '![absolute](C:\\vault\\国际站阿刁\\测试文章1.assets\\absolute.png)',
      '![asset](asset://localhost/C:/vault/%E5%9B%BD%E9%99%85%E7%AB%99%E9%98%BF%E5%88%81/%E6%B5%8B%E8%AF%95%E6%96%87%E7%AB%A01.assets/asset-url.png)',
    ].join('\n')

    const result = auditPerNoteAssets({
      entries: [note, absoluteUsed, assetUrlUsed, unused],
      note,
      content,
    })

    expect(result.referencedAssetPaths).toEqual([absoluteUsed.path, assetUrlUsed.path])
    expect(result.unusedAssetPaths).toEqual([unused.path])
  })

  it('matches reference-style images and wikilink image embeds', () => {
    const note = entry('/vault/国际站阿刁/测试文章1.md')
    const referencedStyle = entry('/vault/国际站阿刁/测试文章1.assets/reference.png')
    const wikilink = entry('/vault/国际站阿刁/测试文章1.assets/wikilink.png')
    const content = [
      '![reference][hero]',
      '[hero]: ./测试文章1.assets/reference.png',
      '![[./测试文章1.assets/wikilink.png]]',
    ].join('\n')

    const result = auditPerNoteAssets({
      entries: [note, referencedStyle, wikilink],
      note,
      content,
    })

    expect(result.unusedAssetPaths).toEqual([])
    expect(result.referencedAssetPaths).toEqual([referencedStyle.path, wikilink.path])
  })
})
