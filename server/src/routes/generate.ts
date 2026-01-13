import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import mockOpenAI from '../mock/mock-openai'
import { streamChatCompletion } from '../services/openai'

interface GenerateRequestBody {
  input?: string
  llm?: {
    apiKey?: string
    baseUrl?: string
    model?: string
  }
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.post('/generate', async (request: FastifyRequest<{ Body: GenerateRequestBody }>, reply: FastifyReply) => {
    const body = request.body ?? {}
    const input = body.input ?? ''

    // Basic auth: if SERVER_API_TOKEN set, require x-api-key header to match
    const serverToken = process.env.SERVER_API_TOKEN
    if (serverToken) {
      const clientToken = (request.headers['x-api-key'] as string) || ''
      if (clientToken !== serverToken) {
        reply.code(401).send({ error: 'Unauthorized' })
        return
      }
    }

    // If OPENAI_API_KEY not set, use mock streaming response
    const apiKey = process.env.OPENAI_API_KEY
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.write('retry: 1000\n\n')

    try {
      // Audit: record request
      try { (await import('../services/audit')).logEvent('generate.request', { input }) } catch (_e) { /* ignore */ }

      // segment input if too long
      const { segmentInput } = await import('../services/segmenter')
      const segments = segmentInput(input, 1000)

      // prefer llm apiKey/baseUrl from request body when provided (frontend can send custom provider config)
      const requestApiKey = (body as any).llm?.apiKey as string | undefined
      const requestBaseUrl = (body as any).llm?.baseUrl as string | undefined
      const requestModel = (body as any).llm?.model as string | undefined

      if (!apiKey && !requestApiKey) {
        for (const seg of segments) {
          const stream = mockOpenAI(seg)
          for await (const chunk of stream) {
            reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
          }
        }
        // Audit: record completed
        try { (await import('../services/audit')).logEvent('generate.complete', { input, mock: true, segments: segments.length }) } catch (_e) { /* ignore */ }
        reply.raw.end()
        return
      }

      // Stream from configured LLM (request-provided first, then env)
      const streamOptions = { apiKey: requestApiKey ?? undefined, baseUrl: requestBaseUrl ?? undefined, model: requestModel ?? undefined }
      for (const seg of segments) {
        for await (const delta of streamChatCompletion(seg, apiKey, streamOptions)) {
          reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`)
        }
      }
      try { (await import('../services/audit')).logEvent('generate.complete', { input, mock: false, segments: segments.length }) } catch (_e) { /* ignore */ }
      reply.raw.end()
    } catch (err: unknown) {
      // Audit: error
      const errorMessage = err instanceof Error ? err.message : String(err)
      try { (await import('../services/audit')).logEvent('generate.error', { input, error: errorMessage }) } catch (_e) { /* ignore */ }
      // On error, send an event with error message and end
      try {
        reply.raw.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
        reply.raw.end()
      } catch (_e) {
        // ignore
      }
    }
  })
}

