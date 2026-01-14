import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import * as useNotesMod from '../../../client/src/hooks/useNotes'
import * as syncContextMod from '../../../client/src/context/SyncContext'
import NotesList from '../../../client/src/pages/NotesList'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, beforeEach, expect } from 'vitest'

// Mock NoteList component to avoid ToastProvider requirement
vi.mock('../../../client/src/components/NoteList/NoteList', () => ({
  default: ({ onCreate }: any) => (
    <button aria-label="Create note" onClick={onCreate}>
      Create note
    </button>
  ),
}))

describe('NotesList page', () => {
  it('creates a new note and calls create()', async () => {
    const notes: any[] = []
    const reload = vi.fn().mockResolvedValue(undefined)
    const syncCreate = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(useNotesMod, 'useNotes').mockReturnValue({
      notes,
      create: vi.fn(),
      reload,
      remove: vi.fn(),
      update: vi.fn(),
      replaceRange: vi.fn(),
    } as any)

    vi.spyOn(syncContextMod, 'useSyncContext').mockReturnValue({
      status: 'connected',
      clientId: 'test-client',
      connect: vi.fn(),
      disconnect: vi.fn(),
      syncCreate,
      syncUpdate: vi.fn(),
      syncDelete: vi.fn(),
      lastRemoteUpdate: 0,
      lastUpdatedNote: null,
      lastDeletedNoteId: null,
    } as any)

    // freeze time to make id deterministic
    vi.spyOn(Date, 'now').mockReturnValue(1670000000000)

    render(
      <MemoryRouter>
        <NotesList />
      </MemoryRouter>
    )

    const btn = screen.getByLabelText('Create note')
    fireEvent.click(btn)

    expect(syncCreate).toHaveBeenCalled()
    const createdArg = syncCreate.mock.calls[0][0]
    expect(createdArg.id).toBe('1670000000000')
    expect(createdArg.title).toBe('Untitled')
  })
})
