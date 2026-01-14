import { useCallback, useRef, useState } from 'react'

export type UseAIStreamOptions = {
  onDelta?: (delta: string) => void
  onError?: (err: Error) => void
  onStart?: () => void
  onComplete?: () => void
}

export type RequestLLM = {
  apiKey?: string
  baseUrl?: string
  model?: string
  promptTemplate?: string
}

type AIStreamRequest = {
  input: string
  llm?: {
    apiKey?: string
    baseUrl?: string
    model?: string
  }
  promptTemplate?: string
}

export function useAIStream() {
  const controllerRef = useRef<AbortController | null>(null)
  const [running, setRunning] = useState(false)
  const runningRef = useRef(false)
  const activeRequestIdRef = useRef(0)
  const [firstCharMs, setFirstCharMs] = useState<number | null>(null)

  const start = useCallback(
    async (input: string, opts?: UseAIStreamOptions, requestLLM?: RequestLLM) => {
      if (runningRef.current) return
      runningRef.current = true
      const requestId = ++activeRequestIdRef.current
      const controller = new AbortController()
      controllerRef.current = controller
      setRunning(true)
      opts?.onStart?.()
      const startedAt = performance.now()
      try {
        const payload: AIStreamRequest = { input }
        if (requestLLM)
          payload.llm = {
            apiKey: requestLLM.apiKey,
            baseUrl: requestLLM.baseUrl,
            model: requestLLM.model,
          }
        if (requestLLM?.promptTemplate) payload.promptTemplate = requestLLM.promptTemplate

        const res = await fetch('/v1/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const txt = await res.text()
          throw new Error(`Generator error: ${res.status} ${txt}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let seenFirst = false

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          // parse SSE-like events separated by \n\n
          const parts = buf.split('\n\n')
          buf = parts.pop() || ''
          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue
            const payload = line.replace(/^data:\s*/i, '')
            try {
              const parsed = JSON.parse(payload)
              if (parsed.delta) {
                if (!seenFirst) {
                  seenFirst = true
                  setFirstCharMs(performance.now() - startedAt)
                }
                if (activeRequestIdRef.current === requestId) {
                  opts?.onDelta?.(parsed.delta)
                }
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (parseErr: unknown) {
              // Re-throw if it's a real error (not a JSON parse error)
              if (
                parseErr instanceof Error &&
                parseErr.message &&
                !parseErr.message.includes('JSON')
              ) {
                throw parseErr
              }
              // ignore JSON parse errors
            }
          }
        }

        if (activeRequestIdRef.current === requestId) {
          opts?.onComplete?.()
        }
      } catch (err: unknown) {
        const e = err as Error
        if (e.name === 'AbortError') {
          // aborted by caller
        } else {
          if (activeRequestIdRef.current === requestId) {
            opts?.onError?.(e)
          }
        }
      } finally {
        if (activeRequestIdRef.current === requestId) {
          runningRef.current = false
          setRunning(false)
          controllerRef.current = null
        }
      }
    },
    []
  )

  const stop = useCallback(() => {
    // Invalidate any in-flight request so its finally block can't clobber newer state.
    activeRequestIdRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    runningRef.current = false
    setRunning(false)
  }, [])

  return { start, stop, running, firstCharMs }
}
