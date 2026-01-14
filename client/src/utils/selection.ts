export type SelectionInfo = {
  text: string
  start: number
  end: number
  isTextarea: boolean
}

/**
 * 获取当前选中的文本信息
 */
export function getSelectionInfo(): SelectionInfo {
  // textarea or input selection
  const active = document.activeElement as HTMLElement | null
  if (
    active &&
    (active.tagName === 'TEXTAREA' ||
      (active.tagName === 'INPUT' && (active as HTMLInputElement).type === 'text'))
  ) {
    const ta = active as HTMLTextAreaElement
    const start = ta.selectionStart ?? 0
    const end = ta.selectionEnd ?? 0
    const text = ta.value.substring(start, end)
    return { text, start, end, isTextarea: true }
  }

  // window selection
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0) {
    const text = sel.toString()
    return { text, start: 0, end: text.length, isTextarea: false }
  }

  return { text: '', start: 0, end: 0, isTextarea: false }
}
