import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NoteList from '../../../client/src/components/NoteList/NoteList'
import * as syncMod from '../../../client/src/context/SyncContext'
import * as toastMod from '../../../client/src/components/Toast'

// Mock dependencies
vi.mock('../../../client/src/context/SyncContext', () => ({
  useSyncContext: vi.fn(),
  SyncProvider: ({ children }: any) => children,
}))

vi.mock('../../../client/src/components/Toast', () => ({
  useGlobalToast: vi.fn(),
  ToastProvider: ({ children }: any) => children,
}))

describe('NoteList', () => {
  beforeEach(() => {
    // Setup default mocks
    vi.mocked(syncMod.useSyncContext).mockReturnValue({
      syncDelete: vi.fn().mockResolvedValue(undefined),
    } as any)
    
    vi.mocked(toastMod.useGlobalToast).mockReturnValue({
      success: vi.fn(),
      error: vi.fn(),
    } as any)
  })

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

    expect(screen.getByText('所有笔记')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Create note'))
    expect(onCreate).toHaveBeenCalled()
  })

  it('shows confirm dialog and calls syncDelete when delete is confirmed', async () => {
    const notes = [
      { id: 'note-1', title: 'Test Note', content: 'Test content' }
    ]
    const syncDelete = vi.fn().mockResolvedValue(undefined)
    const showToastSuccess = vi.fn()
    
    vi.mocked(syncMod.useSyncContext).mockReturnValue({
      syncDelete,
    } as any)
    
    vi.mocked(toastMod.useGlobalToast).mockReturnValue({
      success: showToastSuccess,
      error: vi.fn(),
    } as any)

    render(
      <MemoryRouter>
        <NoteList notes={notes} onCreate={vi.fn()} />
      </MemoryRouter>
    )

    // Click delete button
    const deleteBtn = screen.getByLabelText('Delete note note-1')
    fireEvent.click(deleteBtn)

    // Confirm dialog should appear
    const confirmBtn = await screen.findByText('确认')
    expect(confirmBtn).toBeInTheDocument()

    // Click confirm
    fireEvent.click(confirmBtn)

    // Should call syncDelete with note id
    await waitFor(() => {
      expect(syncDelete).toHaveBeenCalledWith('note-1')
      expect(showToastSuccess).toHaveBeenCalledWith('笔记已删除')
    })
  })

  it('cancels delete when cancel is clicked', async () => {
    const notes = [
      { id: 'note-2', title: 'Another Note', content: 'Content' }
    ]
    const syncDelete = vi.fn()
    
    vi.mocked(syncMod.useSyncContext).mockReturnValue({
      syncDelete,
    } as any)

    render(
      <MemoryRouter>
        <NoteList notes={notes} onCreate={vi.fn()} />
      </MemoryRouter>
    )

    // Click delete button
    const deleteBtn = screen.getByLabelText('Delete note note-2')
    fireEvent.click(deleteBtn)

    // Click cancel
    const cancelBtn = await screen.findByText('取消')
    fireEvent.click(cancelBtn)

    // Should not call syncDelete
    expect(syncDelete).not.toHaveBeenCalled()
  })
})