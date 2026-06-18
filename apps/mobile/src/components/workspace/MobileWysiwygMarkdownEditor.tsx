import type { MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileMarkdownSourceEditor, type MobileMarkdownSourceEditorProps } from './MobileMarkdownSourceEditor'

type MobileWysiwygMarkdownEditorProps = MobileMarkdownSourceEditorProps & {
  layoutProbe?: MobileLayoutProbe
  wysiwygAutocompleteProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
  vaultRootUri?: string | null
}

export function MobileWysiwygMarkdownEditor({
  layoutProbe,
  wysiwygAutocompleteProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
  vaultRootUri,
  ...props
}: MobileWysiwygMarkdownEditorProps) {
  void layoutProbe
  void wysiwygAutocompleteProbe
  void wysiwygWikilinkInsertProbe
  void wysiwygMutationProbe
  void vaultRootUri
  return <MobileMarkdownSourceEditor {...props} />
}
