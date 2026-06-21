export function mobileSingleTextFieldSubmitDisabled({
  allowEmptyInput = false,
  inputValue,
  submitDisabled = false,
}: {
  allowEmptyInput?: boolean
  inputValue: string
  submitDisabled?: boolean
}) {
  return submitDisabled || (!allowEmptyInput && inputValue.trim().length === 0)
}
