import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NoteList from '../../../client/src/components/NoteList/NoteList'

describe('NoteList', () => {
  it('renders notes and calls onCreate', () => {
    const notes = [
      { id: '1', title: 'A', content: 'Hello world' },
      { id: '2', title: 'B', content: 'Second note content' }
    ]
    const onCreate = vi.fn()

    render(
      <MemoryRouter>
        <NoteList notes={notes} onCreate={onCreate} />
      </MemoryRouter>
    )

    expect(screen.getByText('All Notes')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Create note'))
    expect(onCreate).toHaveBeenCalled()
  })
})