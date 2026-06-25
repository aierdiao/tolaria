import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { probeProps, type MobileLayoutProbe } from '../qa/mobileLayoutProbe'
import { desktopPropertyParity } from './desktopParity'
import { mobileColors, mobileSpace, mobileType } from './tokens'

export function MobilePropertyRow({
  accessibilityLabel,
  label,
  layoutProbe,
  layoutProbeId,
  onPress,
  testID,
  value,
}: {
  accessibilityLabel?: string
  label: string
  layoutProbe?: MobileLayoutProbe
  layoutProbeId?: string
  onPress?: () => void
  testID?: string
  value: ReactNode
}) {
  const metricId = layoutProbeId ?? testID
  const content = (
    <>
      <Text {...propertyProbe(layoutProbe, metricId, 'label')} style={styles.label} testID={testID ? `${testID}-label` : undefined}>{label}</Text>
      <View {...propertyProbe(layoutProbe, metricId, 'value')} style={styles.value} testID={testID ? `${testID}-value` : undefined}>
        {typeof value === 'string' ? <Text style={styles.valueText}>{value}</Text> : value}
      </View>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        {...propertyProbe(layoutProbe, metricId, 'row')}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
        testID={testID}
        onPress={onPress}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View {...propertyProbe(layoutProbe, metricId, 'row')} style={styles.row} testID={testID}>
      {content}
    </View>
  )
}

function propertyProbe(layoutProbe: MobileLayoutProbe | undefined, metricId: string | undefined, part: string) {
  return metricId ? probeProps(layoutProbe, `${metricId}.${part}`) : {}
}

const styles = StyleSheet.create({
  label: {
    width: 86,
    color: mobileColors.textMuted,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  row: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
  },
  rowPressed: {
    backgroundColor: mobileColors.graySoft,
  },
  value: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  valueText: {
    color: mobileColors.text,
    fontSize: mobileType.caption,
    fontWeight: '400',
    textAlign: 'right',
  },
})
