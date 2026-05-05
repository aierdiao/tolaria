import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const propertyChipStyles = StyleSheet.create({
  propertyAction: {
    marginLeft: spacing.sm,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  propertyDisabled: {
    opacity: 0.55,
  },
  propertyError: {
    marginBottom: spacing.md,
    color: '#b74234',
    fontSize: 13,
    fontWeight: '700',
  },
  propertyOptionGroup: {
    minHeight: 58,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propertyChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  propertyChip: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
  },
  propertyChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  propertyIconChip: {
    width: 38,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.canvas,
  },
  propertyChipText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  propertyChipTextSelected: {
    color: colors.primary,
  },
})
