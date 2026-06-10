import { useWindowDimensions } from 'react-native'
import { PhoneWorkspaceMock, type PhoneWorkspaceState } from './PhoneWorkspaceMock'
import { TabletWorkspaceMock } from './TabletWorkspaceMock'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'

export function MobileUiLab() {
  const { width } = useWindowDimensions()
  const isWideEnoughForTablet = width >= 900
  const scenario = workspaceScenarioForId(currentScenarioId())

  if (isWideEnoughForTablet) {
    return <TabletWorkspaceMock scenario={scenario} />
  }

  return <PhoneWorkspaceMock initialState={currentPhoneState()} scenario={scenario} />
}

function currentScenarioId() {
  const search = (globalThis as { location?: { search?: string } }).location?.search

  if (!search) return null

  return new URLSearchParams(search).get('scenario')
}

function currentPhoneState(): PhoneWorkspaceState {
  const search = (globalThis as { location?: { search?: string } }).location?.search

  if (!search) return 'list'

  const value = new URLSearchParams(search).get('phoneState')

  if (value === 'editor' || value === 'sidebar') return value

  return 'list'
}
