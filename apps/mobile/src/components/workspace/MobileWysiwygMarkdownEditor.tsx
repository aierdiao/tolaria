import type { MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileMarkdownSourceEditor, type MobileMarkdownSourceEditorProps } from './MobileMarkdownSourceEditor'

type MobileWysiwygMarkdownEditorProps = MobileMarkdownSourceEditorProps & {
  layoutProbe?: MobileLayoutProbe
}

export function MobileWysiwygMarkdownEditor({ layoutProbe, ...props }: MobileWysiwygMarkdownEditorProps) {
  void layoutProbe
  return <MobileMarkdownSourceEditor {...props} />
}
