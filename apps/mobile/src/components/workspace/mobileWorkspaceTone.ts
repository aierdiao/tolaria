import type { MobileTone } from '../../workspace/mobileWorkspaceModel'
import { mobileColors } from '../../ui/tokens'

export type MobileTagTone = 'blue' | 'green' | 'orange' | 'purple' | 'red'

export function noteTypeColor(tone: MobileTone) {
  if (tone === 'blue') return mobileColors.blue
  if (tone === 'green') return mobileColors.green
  if (tone === 'orange') return mobileColors.orange
  if (tone === 'purple') return mobileColors.purple
  if (tone === 'red') return mobileColors.red
  if (tone === 'yellow') return mobileColors.yellow

  return mobileColors.textMuted
}

export function noteTypeSoftColor(tone: MobileTone) {
  if (tone === 'blue') return mobileColors.blueSoft
  if (tone === 'green') return mobileColors.greenSoft
  if (tone === 'orange') return mobileColors.orangeSoft
  if (tone === 'purple') return mobileColors.purpleSoft
  if (tone === 'red') return mobileColors.redSoft
  if (tone === 'yellow') return mobileColors.yellowSoft

  return mobileColors.graySoft
}

export function chipTone(tone: MobileTone) {
  return tone
}

export function statusTone(status: string): 'blue' | 'green' | 'orange' {
  if (status === 'Shipped') return 'green'
  if (status === 'Active') return 'blue'
  return 'orange'
}

export function tagTone(label: string): MobileTagTone {
  const tones = ['blue', 'green', 'orange', 'purple', 'red'] as const
  const index = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % tones.length

  return tones[index]
}
