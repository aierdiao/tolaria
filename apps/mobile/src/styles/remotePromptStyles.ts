import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const remotePromptStyles = StyleSheet.create({
  remotePrompt: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl + 76,
    width: 280,
    gap: spacing.sm,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: spacing.md,
    backgroundColor: colors.canvas,
  },
  remotePromptAction: {
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
  },
  remotePromptActionDisabled: {
    opacity: 0.55,
  },
  remotePromptActionPrimary: {
    backgroundColor: colors.primary,
  },
  remotePromptActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  remotePromptActionTextPrimary: {
    color: colors.canvas,
  },
  remotePromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  remotePromptError: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  remotePromptInput: {
    minHeight: 44,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.canvas,
    fontSize: 16,
    fontWeight: '600',
  },
  remotePromptTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
})
