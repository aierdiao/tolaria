import { describe, expect, it, vi } from 'vitest'
import {
  mergeMobileEditorCommands,
  mobileEditorCommandCapabilities,
  type MobileEditorCommands,
} from './mobileEditorCommands'

describe('mobile editor commands', () => {
  it('does not mark unsupported editor commands as available', () => {
    const commands = { save: vi.fn() } satisfies MobileEditorCommands

    expect(mobileEditorCommandCapabilities(commands)).toEqual({
      pastePlainText: false,
      save: true,
      toggleRawEditor: false,
    })
  })

  it('marks every supplied editor command as available', () => {
    const commands = {
      pastePlainText: vi.fn(),
      save: vi.fn(),
      toggleRawEditor: vi.fn(),
    } satisfies MobileEditorCommands

    expect(mobileEditorCommandCapabilities(commands)).toEqual({
      pastePlainText: true,
      save: true,
      toggleRawEditor: true,
    })
  })

  it('merges panel and editor registrations so chrome commands coexist with active editor commands', () => {
    const save = vi.fn()
    const toggleRawEditor = vi.fn()
    const pastePlainText = vi.fn()

    expect(mergeMobileEditorCommands([
      { toggleRawEditor },
      { pastePlainText, save },
    ])).toEqual({
      pastePlainText,
      save,
      toggleRawEditor,
    })
  })
})
