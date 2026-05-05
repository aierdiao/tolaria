import { useCallback, useState } from 'react'
import type { MobileNote } from './demoData'
import type { MobileNoteFrontmatterSaveResult } from './mobileNoteFrontmatterSave'
import { createMobileNoteFrontmatterPatch, type MobileNotePropertyPatch } from './mobileNoteProperties'

export function useMobileNotePropertiesFlow({
  loadNotes,
  onNotesLoaded,
  saveFrontmatter,
  selectedNote,
}: {
  loadNotes: () => Promise<MobileNote[]>
  onNotesLoaded: (notes: MobileNote[]) => void
  saveFrontmatter: (noteId: string, patch: MobileNotePropertyPatch) => Promise<MobileNoteFrontmatterSaveResult>
  selectedNote: MobileNote
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const saveProperties = useCallback((patch: MobileNotePropertyPatch) => {
    if (isSaving) {
      return
    }

    setFailed(false)
    setIsSaving(true)
    void saveFrontmatter(selectedNote.id, createMobileNoteFrontmatterPatch({ note: selectedNote, patch }))
      .then(async (result) => {
        if (result.status === 'missing') {
          throw new Error(`Missing note: ${result.path}`)
        }

        onNotesLoaded(await loadNotes())
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }, [isSaving, loadNotes, onNotesLoaded, saveFrontmatter, selectedNote])

  return {
    failed,
    isSaving,
    saveProperties,
  }
}
