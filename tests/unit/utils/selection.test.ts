import { getSelectionInfo } from '../../../client/src/utils/selection'

describe('selection util', () => {
  it('reads textarea selection', () => {
    const ta = document.createElement('textarea')
    ta.value = 'abcdefg'
    document.body.appendChild(ta)
    ta.selectionStart = 2
    ta.selectionEnd = 5
    ta.focus()

    const sel = getSelectionInfo()
    expect(sel.text).toBe('cde')
    expect(sel.start).toBe(2)
    expect(sel.end).toBe(5)
    expect(sel.isTextarea).toBe(true)

    document.body.removeChild(ta)
  })
})