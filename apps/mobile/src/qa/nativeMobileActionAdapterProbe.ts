import { readMobileClipboardText, writeMobileClipboardText, type MobileClipboardReader, type MobileClipboardWriter } from '../workspace/mobileClipboard'
import { buildMobileDeepLinkForNote } from '../workspace/mobileDeepLinks'
import { openMobileNoteFile, type MobileFileOpener } from '../workspace/mobileNoteFileOpen'
import { buildMobileFilePathForNote } from '../workspace/mobileNoteFilePath'
import { exportMobileNoteAsPdf, mobilePdfPayloadForNote, type MobilePdfExporter } from '../workspace/mobilePdfExport'
import { revealMobileFolderPath, revealMobileNoteFile, type MobileFileRevealer } from '../workspace/mobileNoteFileReveal'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import type { NativeMobileActionAdapterProof as NativeMobileActionAdapterProofShape } from './nativeMobileActionAdapterProof'

type ActionAdapterProbeText = string

export {
  assertNativeMobileActionAdapterProofs,
  formatNativeMobileActionAdapterFailures,
  nativeMobileActionAdapterLogLine,
  nativeMobileActionAdapterLogPrefix,
  parseNativeMobileActionAdapterProofs,
} from './nativeMobileActionAdapterProof'
export type {
  NativeMobileActionAdapterAssertionFailure,
  NativeMobileActionAdapterProof,
} from './nativeMobileActionAdapterProof'

export type NativeMobileActionAdapterProbeDependencies = {
  clipboardReader?: MobileClipboardReader
  clipboardWriter?: MobileClipboardWriter
  fileOpener?: MobileFileOpener
  fileRevealer?: MobileFileRevealer
  folderRevealer?: MobileFileRevealer
  pdfExporter?: MobilePdfExporter
}

export function nativeMobileActionAdapterProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('mobileActionAdapterProbe') === '1'
}

export async function nativeMobileActionAdapterProof({
  dependencies = {},
  repositoryRequest,
  snapshot,
}: {
  dependencies?: NativeMobileActionAdapterProbeDependencies
  repositoryRequest: ReadOnlyWorkspaceRequest
  snapshot: MobileWorkspaceSnapshot
}): Promise<NativeMobileActionAdapterProofShape> {
  const note = selectedActionAdapterNote(snapshot)
  const vaultRootUri = repositoryRequest.vaultRootUri
  const filePath = buildMobileFilePathForNote({ note, vaultRootUri })
  const deepLink = buildMobileDeepLinkForNote({
    note,
    source: snapshot.source,
    vaultRootUri,
  })
  const pdfPayload = mobilePdfPayloadForNote(note)
  const clipboardFilePathRoundTrip = filePath.ok
    ? await clipboardRoundTrip(filePath.path, dependencies)
    : false
  const clipboardDeepLinkRoundTrip = deepLink.ok
    ? await clipboardRoundTrip(deepLink.url, dependencies)
    : false
  const noteOpen = await openMobileNoteFile({
    note,
    opener: dependencies.fileOpener ?? proofFileOpener,
    vaultRootUri,
  })
  const noteReveal = await revealMobileNoteFile({
    note,
    revealer: dependencies.fileRevealer ?? proofFileRevealer,
    vaultRootUri,
  })
  const folderReveal = await revealMobileFolderPath({
    folderPath: firstActionAdapterFolderPath(snapshot, note),
    revealer: dependencies.folderRevealer ?? proofFileRevealer,
    vaultRootUri,
  })
  const pdfExport = await exportMobileNoteAsPdf(
    note,
    dependencies.pdfExporter ?? proofPdfExporter,
  )

  return {
    clipboardDeepLinkRoundTrip,
    clipboardFilePathRoundTrip,
    deepLinkBuilt: deepLink.ok && deepLink.url.startsWith('tolaria://'),
    filePathBuilt: filePath.ok && filePath.path.length > 0,
    folderRevealOpened: folderReveal.ok && folderReveal.opened,
    noteOpenOpened: noteOpen.ok && noteOpen.opened,
    noteRevealOpened: noteReveal.ok && noteReveal.opened,
    pdfExported: pdfExport.ok && pdfExport.uri !== null,
    pdfHtmlRendered: Boolean(pdfPayload?.html.includes('<main>') && pdfPayload.html.includes('</html>')),
    selectedNoteId: note?.id ?? '',
  }
}

function selectedActionAdapterNote(snapshot: MobileWorkspaceSnapshot): MobileNote | null {
  const notes = snapshot.allNotes ?? snapshot.notes
  return notes.find((note) => note.id === snapshot.selectedNoteId)
    ?? snapshot.notes[0]
    ?? notes[0]
    ?? null
}

function firstActionAdapterFolderPath(snapshot: MobileWorkspaceSnapshot, note: MobileNote | null): string | null {
  return snapshot.folderPaths?.find((path) => path.trim().length > 0)
    ?? parentFolderPath(note?.path)
    ?? null
}

function parentFolderPath(path: string | undefined): string | null {
  const segments = path?.split('/').filter(Boolean) ?? []
  if (segments.length <= 1) return null

  return segments.slice(0, -1).join('/')
}

async function clipboardRoundTrip(
  text: ActionAdapterProbeText,
  dependencies: NativeMobileActionAdapterProbeDependencies,
): Promise<boolean> {
  try {
    await writeMobileClipboardText(text, dependencies.clipboardWriter)
    return await readMobileClipboardText(dependencies.clipboardReader) === text
  } catch {
    return false
  }
}

async function proofFileOpener() {
  return { opened: true, shared: false }
}

async function proofFileRevealer() {
  return { opened: true, shared: false }
}

async function proofPdfExporter(payload: Parameters<MobilePdfExporter>[0]) {
  return {
    shared: false,
    uri: `file:///tolaria-mobile-qa/${encodeURIComponent(payload.fileName)}`,
  }
}
