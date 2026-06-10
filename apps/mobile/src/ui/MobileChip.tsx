import { type StyleProp, type ViewStyle } from 'react-native'
import { Badge } from '../components/ui/badge'
import { Text } from '../components/ui/text'
import { cn } from '../components/ui/utils'

type MobileChipTone = 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow'

export function MobileChip({
  label,
  style,
  tone = 'green',
}: {
  label: string
  style?: StyleProp<ViewStyle>
  tone?: MobileChipTone
}) {
  return (
    <Badge className={cn('rounded-full border-transparent px-1.5 py-0.5', chipClassNames[tone])} style={style} variant="secondary">
      <Text className={cn('text-[11px] font-normal leading-none', chipTextClassNames[tone])} numberOfLines={1}>{label}</Text>
    </Badge>
  )
}

const chipClassNames: Record<MobileChipTone, string> = {
  blue: 'bg-blue-50',
  gray: 'bg-muted',
  green: 'bg-emerald-50',
  orange: 'bg-orange-50',
  purple: 'bg-violet-50',
  red: 'bg-red-50',
  yellow: 'bg-yellow-50',
}

const chipTextClassNames: Record<MobileChipTone, string> = {
  blue: 'text-primary',
  gray: 'text-muted-foreground',
  green: 'text-emerald-700',
  orange: 'text-orange-700',
  purple: 'text-violet-700',
  red: 'text-red-700',
  yellow: 'text-yellow-700',
}
