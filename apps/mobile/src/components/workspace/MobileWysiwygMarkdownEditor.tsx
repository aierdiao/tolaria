import type { MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileMarkdownSourceEditor, type MobileMarkdownSourceEditorProps } from './MobileMarkdownSourceEditor'

type MobileWysiwygMarkdownEditorProps = MobileMarkdownSourceEditorProps & {
  layoutProbe?: MobileLayoutProbe
  wysiwygAutocompleteProbe?: boolean
  wysiwygExternalLinkProbe?: boolean
  wysiwygFormatCommandProbe?: boolean
  wysiwygInputTransformProbe?: boolean
  wysiwygMarkdownBlockProbe?: boolean
  wysiwygTableCommandMutationProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
  vaultRootUri?: string | null
}

export function MobileWysiwygMarkdownEditor({
  layoutProbe,
  wysiwygAutocompleteProbe,
  wysiwygExternalLinkProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
  wysiwygTableCommandMutationProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
  vaultRootUri,
  ...props
}: MobileWysiwygMarkdownEditorProps) {
  void layoutProbe
  void wysiwygAutocompleteProbe
  void wysiwygExternalLinkProbe
  void wysiwygFormatCommandProbe
  void wysiwygInputTransformProbe
  void wysiwygMarkdownBlockProbe
  void wysiwygTableCommandMutationProbe
  void wysiwygWikilinkInsertProbe
  void wysiwygMutationProbe
  void vaultRootUri
  return <MobileMarkdownSourceEditor {...props} />
}
