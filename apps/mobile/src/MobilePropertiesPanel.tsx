import { CaretLeft } from 'phosphor-react-native'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import type { MobileNote } from './demoData'
import { NamedIcon, type IconName } from './NamedIcon'
import {
  isMobileNotePropertySelected,
  mobileNoteIconOptions,
  mobileNoteStatusOptions,
  mobileNoteTagOptions,
  mobileNoteTypeOptions,
  toggleMobileNoteTag,
  type MobileNotePropertyPatch,
} from './mobileNoteProperties'
import { styles } from './styles'
import { colors } from './theme'

export function MobilePropertiesPanel({
  failed = false,
  isSaving = false,
  note,
  onChangeProperties,
  onClose,
}: {
  failed?: boolean
  isSaving?: boolean
  note: MobileNote
  onChangeProperties?: (patch: MobileNotePropertyPatch) => void
  onClose?: () => void
}) {
  const today = formatMobilePropertyDate(new Date())

  return (
    <View style={styles.properties}>
      <PanelToolbar onClose={onClose} />
      <ScrollView contentContainerStyle={styles.propertiesContent}>
        {failed ? <Text style={styles.propertyError}>Could not save property.</Text> : null}
        <PropertyOptionGroup
          disabled={isSaving}
          label="Type"
          options={mobileNoteTypeOptions}
          value={note.type}
          onSelect={(type) => onChangeProperties?.({ type })}
        />
        <PropertyOptionGroup
          disabled={isSaving}
          label="Status"
          options={mobileNoteStatusOptions}
          value={note.status}
          onSelect={(status) => onChangeProperties?.({ status })}
        />
        <PropertyIconOptionGroup
          disabled={isSaving}
          label="Icon"
          options={mobileNoteIconOptions}
          value={note.icon}
          onSelect={(icon) => onChangeProperties?.({ icon })}
        />
        <PropertyRow
          actionLabel="Today"
          disabled={isSaving}
          label="Date"
          value={note.date || 'None'}
          onPress={() => onChangeProperties?.({ date: today })}
        />
        <PropertyRow label="Words" value={String(note.words)} />
        <PropertyRow label="Modified" value={note.modified} />
        <Text style={styles.propertyGroupTitle}>Tags</Text>
        <PropertyOptionChips
          disabled={isSaving}
          options={mobileNoteTagOptions}
          value={note.tags}
          onSelect={(tag) => onChangeProperties?.({ tags: toggleMobileNoteTag(note.tags, tag) })}
        />
        <Text style={styles.propertyGroupTitle}>History</Text>
        <Text style={styles.historyItem}>eb373865c - Updated 1 note</Text>
        <Text style={styles.historyItem}>5e853fdfe - Updated 1 note</Text>
      </ScrollView>
    </View>
  )
}

function PanelToolbar({ onClose }: { onClose?: () => void }) {
  return (
    <View style={styles.toolbar}>
      <Text style={styles.propertiesTitle}>Properties</Text>
      <View style={styles.toolbarSpacer} />
      {onClose ? (
        <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <CaretLeft size={23} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  )
}

function formatMobilePropertyDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function PropertyRow({
  actionLabel,
  disabled = false,
  label,
  onPress,
  value,
}: {
  actionLabel?: string
  disabled?: boolean
  label: string
  onPress?: () => void
  value: string
}) {
  const content = (
    <>
      <Text style={styles.propertyLabel}>{label}</Text>
      <Text style={styles.propertyValue}>{value}</Text>
      {actionLabel ? <Text style={styles.propertyAction}>{actionLabel}</Text> : null}
    </>
  )

  return onPress ? (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.propertyRow, disabled ? styles.propertyDisabled : null, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.propertyRow}>{content}</View>
  )
}

function PropertyOptionGroup({
  disabled,
  label,
  onSelect,
  options,
  value,
}: {
  disabled: boolean
  label: string
  onSelect: (option: string) => void
  options: readonly string[]
  value: string | undefined
}) {
  return (
    <View style={styles.propertyOptionGroup}>
      <Text style={styles.propertyLabel}>{label}</Text>
      <PropertyOptionChips disabled={disabled} options={options} value={value} onSelect={onSelect} />
    </View>
  )
}

function PropertyIconOptionGroup({
  disabled,
  label,
  onSelect,
  options,
  value,
}: {
  disabled: boolean
  label: string
  onSelect: (option: string) => void
  options: readonly string[]
  value: string | undefined
}) {
  return (
    <View style={styles.propertyOptionGroup}>
      <Text style={styles.propertyLabel}>{label}</Text>
      <View style={styles.propertyChipRow}>
        {options.map((option) => {
          const isSelected = isMobileNotePropertySelected({ current: value, option })

          return (
            <SelectablePropertyChip
              disabled={disabled}
              isSelected={isSelected}
              key={option}
              onPress={() => onSelect(option)}
              style={styles.propertyIconChip}
            >
              <NamedIcon color={isSelected ? colors.primary : colors.textSoft} name={option as IconName} size={20} />
            </SelectablePropertyChip>
          )
        })}
      </View>
    </View>
  )
}

function PropertyOptionChips({
  disabled,
  onSelect,
  options,
  value,
}: {
  disabled: boolean
  onSelect: (option: string) => void
  options: readonly string[]
  value: readonly string[] | string | undefined
}) {
  return (
    <View style={styles.propertyChipRow}>
      {options.map((option) => {
        const isSelected = Array.isArray(value)
          ? value.includes(option)
          : isMobileNotePropertySelected({ current: typeof value === 'string' ? value : undefined, option })

        return (
          <SelectablePropertyChip
            disabled={disabled}
            isSelected={isSelected}
            key={option || 'none'}
            onPress={() => onSelect(option)}
            style={styles.propertyChip}
          >
            <Text style={[styles.propertyChipText, isSelected ? styles.propertyChipTextSelected : null]}>
              {option || 'None'}
            </Text>
          </SelectablePropertyChip>
        )
      })}
    </View>
  )
}

function SelectablePropertyChip({
  children,
  disabled,
  isSelected,
  onPress,
  style,
}: {
  children: ReactNode
  disabled: boolean
  isSelected: boolean
  onPress: () => void
  style: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        isSelected ? styles.propertyChipSelected : null,
        disabled ? styles.propertyDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {children}
    </Pressable>
  )
}
