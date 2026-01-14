/**
 * T036: 客户端流式集成测试
 * 模拟 server 流式响应并验证客户端逐字显示行为
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIStream } from '../../../client/src/hooks/useAIStream'

// Mock fetch with SSE-like streaming response
function createMockSSEResponse(chunks: string[], delayMs = 10): Response {
  let chunkIndex = 0

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunkIndex >= chunks.length) {
        controller.close()
        return
      }
      await new Promise((r) => setTimeout(r, delayMs))
      const chunk = chunks[chunkIndex++]
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(chunk))
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('useAIStream - streaming integration', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.useRealTimers()
  })

  it('should receive streaming deltas character by character', async () => {
    const chunks = [
      'data: {"delta":"H"}\n\n',
      'data: {"delta":"e"}\n\n',
      'data: {"delta":"l"}\n\n',
      'data: {"delta":"l"}\n\n',
      'data: {"delta":"o"}\n\n',
    ]

    global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(chunks, 5))

    const deltas: string[] = []
    const onDelta = vi.fn((delta: string) => deltas.push(delta))
    const onComplete = vi.fn()

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test input', { onDelta, onComplete })
      // Let the stream complete
      await vi.advanceTimersByTimeAsync(100)
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })

    expect(deltas).toEqual(['H', 'e', 'l', 'l', 'o'])
    expect(onDelta).toHaveBeenCalledTimes(5)
  })

  it('should track first character latency', async () => {
    const chunks = ['data: {"delta":"X"}\n\n', 'data: {"delta":"Y"}\n\n']

    global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(chunks, 20))

    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onDelta: vi.fn() })
      await vi.advanceTimersByTimeAsync(100)
    })

    // firstCharMs should be set after receiving first delta
    expect(result.current.firstCharMs).toBeGreaterThan(0)
  })

  it('should handle error events from stream', async () => {
    const chunks = ['data: {"error":"API quota exceeded"}\n\n']

    global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(chunks, 5))

    const onError = vi.fn()
    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onError })
      await vi.advanceTimersByTimeAsync(50)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(onError.mock.calls[0][0].message).toContain('API quota exceeded')
  })

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const onError = vi.fn()
    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onError })
      await vi.advanceTimersByTimeAsync(50)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })

    expect(onError.mock.calls[0][0].message).toBe('Network error')
    expect(result.current.running).toBe(false)
  })

  it('should handle HTTP error responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }))

    const onError = vi.fn()
    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onError })
      await vi.advanceTimersByTimeAsync(50)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })

    expect(onError.mock.calls[0][0].message).toContain('500')
  })

  it('should be able to abort ongoing stream', async () => {
    // Create a long-running stream
    const chunks = Array(100).fill('data: {"delta":"."}\n\n')
    global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(chunks, 50))

    const onDelta = vi.fn()
    const onComplete = vi.fn()
    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onDelta, onComplete })
      await vi.advanceTimersByTimeAsync(100)
    })

    // Should be running
    expect(result.current.running).toBe(true)

    // Stop the stream
    act(() => {
      result.current.stop()
    })

    expect(result.current.running).toBe(false)
    // onComplete should not be called after abort
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('should handle multiple sequential requests', async () => {
    const createChunks = (text: string) => text.split('').map((c) => `data: {"delta":"${c}"}\n\n`)

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockSSEResponse(createChunks('AB'), 5))
      .mockResolvedValueOnce(createMockSSEResponse(createChunks('CD'), 5))

    const { result } = renderHook(() => useAIStream())
    const allDeltas: string[] = []

    // First request
    await act(async () => {
      result.current.start('first', { onDelta: (d) => allDeltas.push(d) })
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(allDeltas).toContain('A')
    expect(allDeltas).toContain('B')

    // Second request
    await act(async () => {
      result.current.start('second', { onDelta: (d) => allDeltas.push(d) })
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(allDeltas).toContain('C')
    expect(allDeltas).toContain('D')
  })

  it('should parse chunked SSE data correctly when split across chunks', async () => {
    // Simulate data split across network chunks
    const chunks = ['data: {"del', 'ta":"sp', 'lit"}\n\n']

    global.fetch = vi.fn().mockResolvedValue(createMockSSEResponse(chunks, 5))

    const deltas: string[] = []
    const { result } = renderHook(() => useAIStream())

    await act(async () => {
      result.current.start('test', { onDelta: (d) => deltas.push(d) })
      await vi.advanceTimersByTimeAsync(50)
    })

    expect(deltas).toEqual(['split'])
  })
})
