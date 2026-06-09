import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { TabletWorkspaceMock } from './TabletWorkspaceMock'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { mobileColors } from '../ui/tokens'

export function MobileUiLab() {
  const { width } = useWindowDimensions()
  const isWideEnoughForTablet = width >= 900
  const scenario = workspaceScenarioForId(currentScenarioId())

  if (isWideEnoughForTablet) {
    return <TabletWorkspaceMock scenario={scenario} />
  }

  return (
    <ScrollView horizontal style={styles.scroller}>
      <View style={styles.tabletPreview}>
        <TabletWorkspaceMock scenario={scenario} />
      </View>
    </ScrollView>
  )
}

function currentScenarioId() {
  const search = (globalThis as { location?: { search?: string } }).location?.search

  if (!search) return null

  return new URLSearchParams(search).get('scenario')
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
    backgroundColor: mobileColors.app,
  },
  tabletPreview: {
    width: 1100,
    flex: 1,
  },
})
