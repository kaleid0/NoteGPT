import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../../client/src/hooks/useAIStream', () => ({
  useAIStream: vi.fn()
}))

import { useAIStream } from '../../../client/src/hooks/useAIStream'
import AIStreamModal from '../../../client/src/components/AIStreamModal/AIStreamModal'

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

    render(<AIStreamModal input="x" onAccept={onAccept} onDiscard={onDiscard} />)

    // initially streaming placeholder should be shown
    expect(screen.getByText('Streaming...')).toBeInTheDocument()

    // after start ran, text should update (wait for async deltas)
    expect(await screen.findByText((c) => c.includes('hello') && c.includes('world'))).toBeInTheDocument()

    // Accept should be enabled (running true but text present)
    const acceptBtn = screen.getByText('接受') as HTMLButtonElement
    expect(acceptBtn.disabled).toBe(false)

    fireEvent.click(acceptBtn)
    expect(stop).toHaveBeenCalled()
    const accepted = onAccept.mock.calls[0][0]
    expect(accepted).toEqual(expect.stringContaining('hello'))
    expect(accepted).toEqual(expect.stringContaining('world'))

    // test discard
    fireEvent.click(screen.getByText('丢弃'))
    expect(stop).toHaveBeenCalled()
    expect(onDiscard).toHaveBeenCalled()
  })
})