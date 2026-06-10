import { useWindowDimensions } from 'react-native'
import { PhoneWorkspaceMock, type PhoneWorkspaceState } from './PhoneWorkspaceMock'
import { TabletWorkspace } from './TabletWorkspace'
import { readOnlyWorkspaceRepository } from '../workspace/readOnlyWorkspaceRepository'

export function MobileUiLab() {
  const { width } = useWindowDimensions()
  const isWideEnoughForTablet = width >= 900
  const snapshot = readOnlyWorkspaceRepository.readSnapshot({
    scenarioId: currentScenarioId(),
    source: currentSnapshotSource(),
  })

  if (isWideEnoughForTablet) {
    return <TabletWorkspace snapshot={snapshot} />
  }

  return <PhoneWorkspaceMock initialState={currentPhoneState()} snapshot={snapshot} />
}

function currentScenarioId() {
  return currentSearchParams().get('scenario')
}

function currentPhoneState(): PhoneWorkspaceState {
  const value = currentSearchParams().get('phoneState')

  if (value === 'editor' || value === 'sidebar') return value

  return 'list'
}

function currentSnapshotSource() {
  return currentSearchParams().get('source') === 'host-vault' ? 'host' : 'fixture'
}

function currentSearchParams() {
  const search = (globalThis as { location?: { search?: string } }).location?.search
  return new URLSearchParams(search ?? '')
}
