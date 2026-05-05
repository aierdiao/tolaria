import type { MobileGitSyncPlan } from './mobileGitSyncPlan'

export type MobileGitSyncStatusTone = 'attention' | 'neutral' | 'positive' | 'warning'

export type MobileGitSyncStatusView = {
  actionLabel: string | null
  detail: string
  label: string
  tone: MobileGitSyncStatusTone
}

export function mobileGitSyncStatusView(plan: MobileGitSyncPlan): MobileGitSyncStatusView | null {
  switch (plan.state) {
    case 'localOnly':
      return null
    case 'authRequired':
      return {
        actionLabel: 'Connect',
        detail: authDetail(plan),
        label: 'Git authentication required',
        tone: 'attention',
      }
    case 'ready':
      return {
        actionLabel: actionLabel(plan.primaryAction),
        detail: plan.canPush ? 'Local changes are ready to push.' : 'Vault can pull from remote.',
        label: `${plan.remote.owner}/${plan.remote.repository}`,
        tone: plan.canPush ? 'warning' : 'positive',
      }
    case 'syncing':
      return {
        actionLabel: null,
        detail: `${actionLabel(plan.operation)} in progress.`,
        label: `${plan.remote.owner}/${plan.remote.repository}`,
        tone: 'neutral',
      }
    case 'failed':
      return {
        actionLabel: 'Retry',
        detail: plan.message,
        label: `${actionLabel(plan.operation)} failed`,
        tone: 'warning',
      }
  }
}

function authDetail(plan: Extract<MobileGitSyncPlan, { state: 'authRequired' }>) {
  return plan.authStrategy === 'githubOAuth'
    ? `Connect GitHub for ${plan.host}.`
    : `Add an SSH key for ${plan.host}.`
}

function actionLabel(action: 'clone' | 'pull' | 'push') {
  return action[0].toUpperCase() + action.slice(1)
}
