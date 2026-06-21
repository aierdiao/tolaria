import { describe, expect, it } from 'vitest'
import { mobileSingleTextFieldSubmitDisabled } from './MobileWorkspaceActionSheetModel'

describe('mobile workspace action sheet', () => {
  it('allows title-less note creation while keeping required field guards', () => {
    expect(mobileSingleTextFieldSubmitDisabled({
      allowEmptyInput: true,
      inputValue: '',
    })).toBe(false)

    expect(mobileSingleTextFieldSubmitDisabled({
      inputValue: '',
    })).toBe(true)

    expect(mobileSingleTextFieldSubmitDisabled({
      allowEmptyInput: true,
      inputValue: '',
      submitDisabled: true,
    })).toBe(true)
  })
})
