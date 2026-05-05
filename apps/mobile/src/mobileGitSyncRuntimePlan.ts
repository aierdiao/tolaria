import { createMobileGitSyncPlan, type MobileGitCredentialState, type MobileGitSyncPlan } from './mobileGitSyncPlan'
import { createMobileVaultConfig } from './mobileVaultConfig'
import type { MobileVaultMetadata } from './mobileVaultMetadata'

export function createMobileGitSyncPlanForVault({
  credentials = { state: 'missing' },
  vault,
}: {
  credentials?: MobileGitCredentialState
  vault: MobileVaultMetadata
}): MobileGitSyncPlan {
  const result = createMobileVaultConfig(vault)
  if (!result.ok) {
    return { primaryAction: null, state: 'localOnly' }
  }

  return createMobileGitSyncPlan({
    credentials,
    sync: result.config.sync,
  })
}
