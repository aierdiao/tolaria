import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type MobileEditorCommands = {
  pastePlainText?: () => void
  save?: () => void
  toggleRawEditor?: () => void
}

export type RegisterMobileEditorCommands = (commands: MobileEditorCommands) => () => void
type MobileEditorCommandCapabilities = {
  pastePlainText: boolean
  save: boolean
  toggleRawEditor: boolean
}

const emptyEditorCommands: MobileEditorCommands = {}
type MobileEditorCommandRegistration = {
  commands: MobileEditorCommands
  token: number
}

export function useMobileEditorCommandRegistry() {
  const nextTokenRef = useRef(1)
  const [registrations, setRegistrations] = useState<MobileEditorCommandRegistration[]>([])

  const register = useCallback<RegisterMobileEditorCommands>((commands) => {
    const token = nextTokenRef.current
    nextTokenRef.current += 1
    setRegistrations((current) => [...current, { commands, token }])

    return () => {
      setRegistrations((current) => current.filter((registration) => registration.token !== token))
    }
  }, [])
  const commands = useMemo(
    () => mergeMobileEditorCommands(registrations.map((registration) => registration.commands)),
    [registrations],
  )

  return useMemo(() => ({
    commands,
    register,
  }), [commands, register])
}

export function useRegisteredMobileEditorCommands(
  register: RegisterMobileEditorCommands | undefined,
  commands: MobileEditorCommands,
) {
  const commandsRef = useRef(commands)
  useEffect(() => {
    commandsRef.current = commands
  }, [commands])

  const capabilities = mobileEditorCommandCapabilities(commands)
  const registeredCommands = useMemo<MobileEditorCommands>(() => {
    const nextCommands: MobileEditorCommands = {}

    if (capabilities.pastePlainText) {
      nextCommands.pastePlainText = () => {
        commandsRef.current.pastePlainText?.()
      }
    }

    if (capabilities.save) {
      nextCommands.save = () => {
        commandsRef.current.save?.()
      }
    }

    if (capabilities.toggleRawEditor) {
      nextCommands.toggleRawEditor = () => {
        commandsRef.current.toggleRawEditor?.()
      }
    }

    return nextCommands
  }, [capabilities.pastePlainText, capabilities.save, capabilities.toggleRawEditor])

  useEffect(() => {
    if (!register) return undefined
    return register(registeredCommands)
  }, [register, registeredCommands])
}

export function mobileEditorCommandCapabilities(
  commands: MobileEditorCommands,
): MobileEditorCommandCapabilities {
  return {
    pastePlainText: commands.pastePlainText !== undefined,
    save: commands.save !== undefined,
    toggleRawEditor: commands.toggleRawEditor !== undefined,
  }
}

export function mergeMobileEditorCommands(
  registrations: readonly MobileEditorCommands[],
): MobileEditorCommands {
  if (registrations.length === 0) return emptyEditorCommands

  const merged: MobileEditorCommands = {}
  for (const commands of registrations) {
    if (commands.pastePlainText) merged.pastePlainText = commands.pastePlainText
    if (commands.save) merged.save = commands.save
    if (commands.toggleRawEditor) merged.toggleRawEditor = commands.toggleRawEditor
  }
  return merged
}
