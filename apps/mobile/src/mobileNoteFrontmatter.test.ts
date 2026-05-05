import { describe, expect, it } from 'vitest'
import { readMobileNoteFrontmatter } from './mobileNoteFrontmatter'

describe('mobile note frontmatter', () => {
  it('reads supported scalar note metadata', () => {
    expect(readMobileNoteFrontmatter([
      '---',
      'type: Essay',
      'icon: pen-nib',
      'status: Active',
      'date: "2026-05-05"',
      '---',
      '# Workflow',
    ].join('\n'))).toEqual({
      date: '2026-05-05',
      icon: 'pen-nib',
      status: 'Active',
      tags: [],
      type: 'Essay',
    })
  })

  it('reads inline tag lists', () => {
    expect(readMobileNoteFrontmatter('---\ntags: [Tolaria MVP, "mobile"]\n---\n# Note')).toEqual({
      date: undefined,
      icon: undefined,
      status: undefined,
      tags: ['Tolaria MVP', 'mobile'],
      type: undefined,
    })
  })

  it('returns empty metadata when frontmatter is missing', () => {
    expect(readMobileNoteFrontmatter('# Note')).toEqual({
      date: undefined,
      icon: undefined,
      status: undefined,
      tags: [],
      type: undefined,
    })
  })
})
