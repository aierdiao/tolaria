import { describe, expect, it } from 'vitest'
import { createMobileGitSyncPlanForVault } from './mobileGitSyncRuntimePlan'

describe('createMobileGitSyncPlanForVault', () => {
  it('keeps app-local vaults hidden from Git sync status', () => {
    expect(createMobileGitSyncPlanForVault({
      vault: { id: 'personal', name: 'Personal Journal' },
    })).toEqual({
      primaryAction: null,
      state: 'localOnly',
    })
  })

  it('requires credentials for remote-backed vaults', () => {
    expect(createMobileGitSyncPlanForVault({
      vault: {
        id: 'tolaria',
        name: 'Tolaria',
        remoteUrl: 'https://github.com/refactoringhq/tolaria.git',
      },
    })).toMatchObject({
      authStrategy: 'githubOAuth',
      host: 'github.com',
      primaryAction: 'authenticate',
      state: 'authRequired',
    })
  })

  it('plans ready sync when credentials are available', () => {
    expect(createMobileGitSyncPlanForVault({
      credentials: { state: 'available' },
      vault: {
        id: 'tolaria',
        name: 'Tolaria',
        remoteUrl: 'git@git.example.com:refactoringhq/tolaria.git',
      },
    })).toMatchObject({
      canPull: true,
      canPush: false,
      primaryAction: 'pull',
      state: 'ready',
    })
  })

  it('treats invalid remote metadata as local-only until vault management can repair it', () => {
    expect(createMobileGitSyncPlanForVault({
      vault: { id: 'broken', name: 'Broken', remoteUrl: '/Users/luca/Laputa' },
    })).toEqual({
      primaryAction: null,
      state: 'localOnly',
    })
  })
})
