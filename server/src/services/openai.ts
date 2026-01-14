interface OpenAIChatChoice {
  delta?: {
    content?: string
  }
}

interface OpenAIChatChunk {
  choices?: OpenAIChatChoice[]
}

export type StreamOptions = {
  apiKey?: string
  baseUrl?: string
  model?: string
}

export async function* streamChatCompletion(
  input: string,
  apiKey: string | undefined,
  options: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
  const apiKeyToUse = options.apiKey ?? apiKey
  const base = options.baseUrl ?? 'https://api.openai.com'
  const url = base.replace(/\/$/, '') + '/v1/chat/completions'
  const body = {
    model: options.model ?? 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: input }],
    temperature: 0.7,
    stream: true,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKeyToUse ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const txt = await res.text()
    throw new Error(`OpenAI request failed: ${res.status} ${txt}`)
  }

  const reader = (res.body as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE-style data batches separated by \n\n
    let parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.replace(/^data:\s*/i, '')
      if (payload === '[DONE]') {
        return
      }
      try {
        const parsed = JSON.parse(payload) as OpenAIChatChunk
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          yield delta
        }
      } catch (_err) {
        // ignore JSON parse errors
      }
    }
  }
}
