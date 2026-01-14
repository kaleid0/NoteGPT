import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { act } from 'react'
import { vi, describe, it, expect } from 'vitest'
import AIStreamTester from './utils/AIStreamTester'

// mock fetch to return a readable stream with SSE data
function makeMockResponse(chunks: string[]) {
  return {
    ok: true,
    body: {
      getReader() {
        let i = 0
        return {
          async read() {
            if (i >= chunks.length) return { done: true, value: undefined }
            const chunk = new TextEncoder().encode(chunks[i++])
            return { done: false, value: chunk }
          },
        }
      },
    },
  }
}

it('calls onDelta for each SSE delta chunk', async () => {
  ;(globalThis as any).fetch = async () =>
    makeMockResponse(['data: {"delta":"hello"}\n\ndata: {"delta":" world"}\n\n'])

  const onDeltas: string[] = []

  const { getByTestId } = render(<AIStreamTester onDelta={(d) => onDeltas.push(d)} />)

  act(() => {
    // click start button inside tester
    getByTestId('start-btn').click()
  })

  await waitFor(() => {
    expect(onDeltas.join('')).toBe('hello world')
  })
})
