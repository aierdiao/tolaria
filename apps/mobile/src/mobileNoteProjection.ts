import { countWords, deriveDisplayTitleState, extractSnippet } from '@tolaria/markdown'

export type MobileNoteSource = {
  id: string
  type: string
  icon: string
  date: string
  modified: string
  filename: string
  content: string
  status?: string
  tags: string[]
}

export type MobileNote = Omit<MobileNoteSource, 'filename'> & {
  title: string
  snippet: string
  words: number
}

export function projectMobileNote(source: MobileNoteSource): MobileNote {
  const titleState = deriveDisplayTitleState({
    content: source.content,
    filename: source.filename,
  })

  return {
    id: source.id,
    type: source.type,
    icon: source.icon,
    date: source.date,
    modified: source.modified,
    content: source.content,
    status: source.status,
    tags: source.tags,
    title: titleState.title,
    snippet: extractSnippet(source.content),
    words: countWords(source.content),
  }
}

export function projectMobileNotes(sources: MobileNoteSource[]): MobileNote[] {
  return sources.map(projectMobileNote)
}
