import { describe, expect, it } from 'vitest'
import type { MobileGitRemote } from './mobileGitRemote'
import { mobileGitSyncStatusView } from './mobileGitSyncStatus'

describe('mobileGitSyncStatusView', () => {
  it('hides local-only vaults from sync status chrome', () => {
    expect(mobileGitSyncStatusView({ state: 'localOnly', primaryAction: null })).toBeNull()
  })

  it('summarizes authentication requirements by strategy', () => {
    expect(mobileGitSyncStatusView({
      authStrategy: 'githubOAuth',
      host: 'github.com',
      primaryAction: 'authenticate',
      state: 'authRequired',
    })).toMatchObject({
      actionLabel: 'Connect',
      detail: 'Connect GitHub for github.com.',
      tone: 'attention',
    })

    expect(mobileGitSyncStatusView({
      authStrategy: 'sshKey',
      host: 'git.example.com',
      primaryAction: 'authenticate',
      state: 'authRequired',
    })).toMatchObject({
      detail: 'Add an SSH key for git.example.com.',
    })
  })

  it.each([
    { canPush: false, actionLabel: 'Pull', detail: 'Vault can pull from remote.', tone: 'positive' },
    { canPush: true, actionLabel: 'Push', detail: 'Local changes are ready to push.', tone: 'warning' },
  ] as const)('summarizes ready sync state with $actionLabel', ({ actionLabel, canPush, detail, tone }) => {
    expect(mobileGitSyncStatusView({
      canPull: true,
      canPush,
      primaryAction: canPush ? 'push' : 'pull',
      remote: remote(),
      state: 'ready',
    })).toMatchObject({
      actionLabel,
      detail,
      label: 'refactoringhq/tolaria',
      tone,
    })
  })

  it('summarizes syncing and failed operations', () => {
    expect(mobileGitSyncStatusView({
      operation: 'pull',
      primaryAction: null,
      remote: remote(),
      state: 'syncing',
    })).toMatchObject({
      actionLabel: null,
      detail: 'Pull in progress.',
      tone: 'neutral',
    })

    expect(mobileGitSyncStatusView({
      message: 'Authentication failed',
      operation: 'push',
      primaryAction: 'retry',
      remote: remote(),
      state: 'failed',
    })).toMatchObject({
      actionLabel: 'Retry',
      detail: 'Authentication failed',
      label: 'Push failed',
    })
  })
})

function remote(): MobileGitRemote {
  return {
    authStrategy: 'githubOAuth',
    host: 'github.com',
    owner: 'refactoringhq',
    repository: 'tolaria',
    url: 'https://github.com/refactoringhq/tolaria.git',
  }
}
