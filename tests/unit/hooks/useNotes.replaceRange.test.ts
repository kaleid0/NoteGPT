import React from 'react'
import * as notesDAO from '../../../client/src/lib/db/notes'
import useNotesStore from '../../../client/src/stores/notesStore'
import { useNotes } from '../../../client/src/hooks/useNotes'

describe('useNotes replaceRange', () => {
  it('replaces the given range and upserts', async () => {
    const note = { id: '1', content: 'hello world', createdAt: '', updatedAt: '' }
    const upsertNote = vi.spyOn(notesDAO, 'upsertNote').mockResolvedValue(undefined)
    const getAllNotes = vi.spyOn(notesDAO, 'getAllNotes').mockResolvedValue([note as any])

    // Initialize store with the note
    const store = useNotesStore.getState()
    store.notesById['1'] = note as any
    store.noteIds = ['1']

    // render a component to access the hook
    let replaceRangeFn: any = null
    function Tester() {
      const api = useNotes()
      replaceRangeFn = api.replaceRange
      return null
    }

    const { unmount } = require('@testing-library/react').render(React.createElement(Tester))

    // call in act
    await require('react-dom/test-utils').act(async () => {
      const updated = await replaceRangeFn('1', 6, 11, 'universe')
      expect(updated.content).toBe('hello universe')
    })

    // replaceRange uses local store state, not getNote
    expect(upsertNote).toHaveBeenCalled()

    // cleanup
    unmount()
    upsertNote.mockRestore()
    getAllNotes.mockRestore()
  })
})