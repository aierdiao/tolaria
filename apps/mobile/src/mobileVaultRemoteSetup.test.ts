import { describe, expect, it } from 'vitest'
import { updateMobileVaultRemote } from './mobileVaultRemoteSetup'

describe('updateMobileVaultRemote', () => {
  it('adds a valid remote URL to the active vault', () => {
    expect(updateMobileVaultRemote({
      activeVaultId: 'personal',
      remoteUrl: '  https://github.com/refactoringhq/tolaria.git  ',
      vaults: [{ id: 'personal', name: 'Personal Journal' }],
    })).toEqual({
      activeVault: {
        id: 'personal',
        name: 'Personal Journal',
        remoteUrl: 'https://github.com/refactoringhq/tolaria.git',
      },
      ok: true,
      vaults: [{
        id: 'personal',
        name: 'Personal Journal',
        remoteUrl: 'https://github.com/refactoringhq/tolaria.git',
      }],
    })
  })

  it('removes the remote URL when the value is blank', () => {
    expect(updateMobileVaultRemote({
      activeVaultId: 'personal',
      remoteUrl: ' ',
      vaults: [{
        id: 'personal',
        name: 'Personal Journal',
        remoteUrl: 'https://github.com/refactoringhq/tolaria.git',
      }],
    })).toMatchObject({
      activeVault: {
        id: 'personal',
        name: 'Personal Journal',
      },
      ok: true,
    })
  })

  it('rejects unsupported remote URL formats', () => {
    expect(updateMobileVaultRemote({
      activeVaultId: 'personal',
      remoteUrl: '/Users/luca/Laputa',
      vaults: [{ id: 'personal', name: 'Personal Journal' }],
    })).toEqual({
      error: 'invalidRemoteUrl',
      ok: false,
    })
  })
})
