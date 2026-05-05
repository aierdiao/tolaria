import { createMobileVaultConfig } from './mobileVaultConfig'
import type { MobileVaultMetadata } from './mobileVaultMetadata'

export type MobileVaultRemoteSetupResult =
  | {
      activeVault: MobileVaultMetadata
      ok: true
      vaults: MobileVaultMetadata[]
    }
  | {
      error: 'invalidRemoteUrl' | 'missingVault'
      ok: false
    }

export function updateMobileVaultRemote({
  activeVaultId,
  remoteUrl,
  vaults,
}: {
  activeVaultId: string
  remoteUrl: string
  vaults: MobileVaultMetadata[]
}): MobileVaultRemoteSetupResult {
  const activeVault = vaults.find((vault) => vault.id === activeVaultId)
  if (!activeVault) {
    return { error: 'missingVault', ok: false }
  }

  const updatedVault = createUpdatedVault({ remoteUrl, vault: activeVault })
  if (!createMobileVaultConfig(updatedVault).ok) {
    return { error: 'invalidRemoteUrl', ok: false }
  }

  return {
    activeVault: updatedVault,
    ok: true,
    vaults: vaults.map((vault) => vault.id === activeVaultId ? updatedVault : vault),
  }
}

function createUpdatedVault({
  remoteUrl,
  vault,
}: {
  remoteUrl: string
  vault: MobileVaultMetadata
}) {
  const normalizedRemoteUrl = remoteUrl.trim()
  if (!normalizedRemoteUrl) {
    return {
      id: vault.id,
      name: vault.name,
    }
  }

  return {
    ...vault,
    remoteUrl: normalizedRemoteUrl,
  }
}
