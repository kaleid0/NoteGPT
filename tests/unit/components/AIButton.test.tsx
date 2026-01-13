import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AIButton from '../../../client/src/components/AIButton/AIButton'

describe('AIButton', () => {
  it('renders and calls onClick', () => {
    const onClick = vi.fn()
    render(<AIButton onClick={onClick} />)
    const btn = screen.getByLabelText('Trigger AI')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })
})