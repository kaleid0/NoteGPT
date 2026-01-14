import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'

vi.mock('../../../client/src/hooks/useAIStream', () => ({
  useAIStream: vi.fn(),
}))

import { useAIStream } from '../../../client/src/hooks/useAIStream'
import AIStreamModal from '../../../client/src/components/AIStreamModal/AIStreamModal'
import { ToastProvider } from '../../../client/src/components/Toast/ToastContext'

describe('AIStreamModal', () => {
  it('shows streaming and accepts/discards', async () => {
    const start = vi.fn((input, opts) => {
      // simulate streaming asynchronously
      setTimeout(() => opts.onDelta('hello'), 0)
      setTimeout(() => opts.onDelta(' world'), 10)
    })
    const stop = vi.fn()

    ;(useAIStream as any).mockReturnValue({ start, stop, running: true })

    const onAccept = vi.fn()
    const onDiscard = vi.fn()

    render(
      <ToastProvider>
        <AIStreamModal input="x" onAccept={onAccept} onDiscard={onDiscard} />
      </ToastProvider>
    )

    // initially streaming placeholder should be shown (Chinese text)
    expect(screen.getByText('正在生成更智能的内容...')).toBeInTheDocument()

    // Accept button should be disabled while streaming
    const acceptBtn = screen.getByText('采用') as HTMLButtonElement
    expect(acceptBtn.disabled).toBe(true)

    // after start ran, text should update (wait for async deltas)
    expect(
      await screen.findByText((c) => c.includes('hello') && c.includes('world'))
    ).toBeInTheDocument()

    // Accept should still be disabled while running (even with text present)
    expect(acceptBtn.disabled).toBe(true)

    // test discard
    fireEvent.click(screen.getByText('取消'))
    expect(stop).toHaveBeenCalled()
    expect(onDiscard).toHaveBeenCalled()
  })

  it('enables accept button when streaming completes', async () => {
    const start = vi.fn((input, opts) => {
      // simulate streaming completion
      setTimeout(() => {
        opts.onDelta('completed content')
        opts.onComplete()
      }, 0)
    })
    const stop = vi.fn()

    // Initially running
    const mockReturn = { start, stop, running: true }
    ;(useAIStream as any).mockReturnValue(mockReturn)

    const onAccept = vi.fn()
    const onDiscard = vi.fn()

    const { rerender } = render(
      <ToastProvider>
        <AIStreamModal input="x" onAccept={onAccept} onDiscard={onDiscard} />
      </ToastProvider>
    )

    // Button should be disabled while running
    const acceptBtn = screen.getByText('采用') as HTMLButtonElement
    expect(acceptBtn.disabled).toBe(true)

    // Simulate streaming complete - running becomes false
    ;(useAIStream as any).mockReturnValue({ start, stop, running: false })
    rerender(
      <ToastProvider>
        <AIStreamModal input="x" onAccept={onAccept} onDiscard={onDiscard} />
      </ToastProvider>
    )

    // Now accept button should be enabled
    expect(acceptBtn.disabled).toBe(false)

    // Click accept
    fireEvent.click(acceptBtn)
    expect(stop).toHaveBeenCalled()
    expect(onAccept).toHaveBeenCalled()
  })
})
