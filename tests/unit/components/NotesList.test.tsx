import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import * as useNotesMod from '../../../client/src/hooks/useNotes'
import NotesList from '../../../client/src/pages/NotesList'
import { MemoryRouter } from 'react-router-dom'

describe('NotesList page', () => {
  it('creates a new note and calls create()', async () => {
    const create = vi.fn().mockResolvedValue(undefined)
    const notes: any[] = []

    vi.spyOn(useNotesMod, 'useNotes').mockReturnValue({ notes, create, reload: vi.fn(), remove: vi.fn(), update: vi.fn() } as any)

    // freeze time to make id deterministic
    vi.spyOn(Date, 'now').mockReturnValue(1670000000000)

    render(
      <MemoryRouter>
        <NotesList />
      </MemoryRouter>
    )

    const btn = screen.getByLabelText('Create note')
    fireEvent.click(btn)

    expect(create).toHaveBeenCalled()
    const createdArg = create.mock.calls[0][0]
    expect(createdArg.id).toBe('1670000000000')
    expect(createdArg.title).toBe('Untitled')
  })
})