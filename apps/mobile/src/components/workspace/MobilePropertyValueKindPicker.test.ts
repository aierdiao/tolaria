import { describe, expect, it } from 'vitest'
import { mobileText } from '../../i18n/mobileText'
import { mobilePropertyValueKindOptions } from './mobilePropertyValueKindOptions'

describe('mobile property value kind picker', () => {
  it('keeps the desktop display-mode option order', () => {
    expect(mobilePropertyValueKindOptions.map((option) => option.kind)).toEqual([
      'string',
      'number',
      'date',
      'boolean',
      'status',
      'url',
      'list',
      'color',
    ])
  })

  it('keeps the mobile labels aligned with the desktop display-mode menu', () => {
    expect(mobilePropertyValueKindOptions.map((option) => mobileText(option.labelKey))).toEqual([
      'Text',
      'Number',
      'Date',
      'Boolean',
      'Status',
      'URL',
      'Tags',
      'Color',
    ])
  })
})
