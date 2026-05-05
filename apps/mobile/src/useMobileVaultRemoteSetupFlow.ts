import { useCallback, useState } from 'react'
import type { MobileVaultMetadata } from './mobileVaultMetadata'
import type { MobileVaultMetadataStorage } from './mobileVaultMetadataStorage'
import { updateMobileVaultRemote } from './mobileVaultRemoteSetup'

export function useMobileVaultRemoteSetupFlow({
  activeVault,
  metadataStorage,
  onActiveVaultChanged,
}: {
  activeVault: MobileVaultMetadata
  metadataStorage: MobileVaultMetadataStorage
  onActiveVaultChanged: (vault: MobileVaultMetadata) => void
}) {
  const [failed, setFailed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState(activeVault.remoteUrl ?? '')

  const open = useCallback(() => {
    setFailed(false)
    setRemoteUrl(activeVault.remoteUrl ?? '')
    setIsOpen(true)
  }, [activeVault.remoteUrl])
  const cancel = useCallback(() => {
    setFailed(false)
    setIsOpen(false)
  }, [])
  const submit = useCallback(() => {
    if (isSaving) {
      return
    }

    setFailed(false)
    setIsSaving(true)
    void saveRemoteSetup({
      activeVault,
      metadataStorage,
      onActiveVaultChanged,
      remoteUrl,
    })
      .then(() => setIsOpen(false))
      .catch(() => setFailed(true))
      .finally(() => setIsSaving(false))
  }, [activeVault, isSaving, metadataStorage, onActiveVaultChanged, remoteUrl])

  return {
    cancel,
    failed,
    isOpen,
    isSaving,
    open,
    remoteUrl,
    setRemoteUrl,
    submit,
  }
}

async function saveRemoteSetup({
  activeVault,
  metadataStorage,
  onActiveVaultChanged,
  remoteUrl,
}: {
  activeVault: MobileVaultMetadata
  metadataStorage: MobileVaultMetadataStorage
  onActiveVaultChanged: (vault: MobileVaultMetadata) => void
  remoteUrl: string
}) {
  const result = updateMobileVaultRemote({
    activeVaultId: activeVault.id,
    remoteUrl,
    vaults: await metadataStorage.load(),
  })
  if (!result.ok) {
    throw new Error(result.error)
  }

  await metadataStorage.save(result.vaults)
  onActiveVaultChanged(result.activeVault)
}
