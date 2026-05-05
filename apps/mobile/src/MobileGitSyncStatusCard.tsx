import { GitBranch, WarningCircle } from 'phosphor-react-native'
import { Text, View } from 'react-native'
import { mobileGitSyncStatusView, type MobileGitSyncStatusTone } from './mobileGitSyncStatus'
import type { MobileGitSyncPlan } from './mobileGitSyncPlan'
import { styles } from './styles'
import { colors } from './theme'

export function MobileGitSyncStatusCard({ plan }: { plan: MobileGitSyncPlan }) {
  const status = mobileGitSyncStatusView(plan)
  if (!status) {
    return null
  }

  const Icon = status.tone === 'warning' || status.tone === 'attention' ? WarningCircle : GitBranch

  return (
    <View style={[styles.gitSyncStatus, gitSyncToneStyle(status.tone)]}>
      <Icon size={18} color={colors.textSoft} />
      <View style={styles.gitSyncStatusCopy}>
        <Text style={styles.gitSyncStatusLabel}>{status.label}</Text>
        <Text style={styles.gitSyncStatusDetail}>{status.detail}</Text>
      </View>
      {status.actionLabel ? <Text style={styles.gitSyncStatusAction}>{status.actionLabel}</Text> : null}
    </View>
  )
}

function gitSyncToneStyle(tone: MobileGitSyncStatusTone) {
  switch (tone) {
    case 'attention':
      return styles.gitSyncStatus_attention
    case 'neutral':
      return styles.gitSyncStatus_neutral
    case 'positive':
      return styles.gitSyncStatus_positive
    case 'warning':
      return styles.gitSyncStatus_warning
  }
}
