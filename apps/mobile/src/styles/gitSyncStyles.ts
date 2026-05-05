import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const gitSyncStyles = StyleSheet.create({
  gitSyncStatus: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gitSyncStatus_attention: {
    borderColor: '#d99b57',
    backgroundColor: '#fff4e6',
  },
  gitSyncStatus_neutral: {
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  gitSyncStatus_positive: {
    borderColor: '#9bc49d',
    backgroundColor: '#edf8ef',
  },
  gitSyncStatus_warning: {
    borderColor: '#d8b15f',
    backgroundColor: '#fff7dd',
  },
  gitSyncStatusAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  gitSyncStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  gitSyncStatusDetail: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  gitSyncStatusLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
})
