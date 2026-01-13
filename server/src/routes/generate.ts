import { FastifyInstance } from 'fastify'
import mockOpenAI from '../mock/mock-openai'
import { streamChatCompletion } from '../services/openai'

export default async function (fastify: FastifyInstance) {
  fastify.post('/generate', async (request, reply) => {
    const body = request.body as any
    const input = body?.input ?? ''

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
    reply.header('Content-Type', 'text/event-stream')
    reply.header('Cache-Control', 'no-cache')
    reply.raw.write('retry: 1000\n\n')

    try {
      // Audit: record request
      try { (await import('../services/audit')).logEvent('generate.request', { input }) } catch (e) {}

      // segment input if too long
      const { segmentInput } = await import('../services/segmenter')
      const segments = segmentInput(input, 1000)

      if (!apiKey) {
        for (const seg of segments) {
          const stream = mockOpenAI(seg)
          for await (const chunk of stream) {
            reply.raw.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
          }
        }
        // Audit: record completed
        try { (await import('../services/audit')).logEvent('generate.complete', { input, mock: true, segments: segments.length }) } catch (e) {}
        reply.raw.end()
        return
      }

      // Stream from OpenAI and forward to client as SSE
      for (const seg of segments) {
        for await (const delta of streamChatCompletion(seg, apiKey)) {
          reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`)
        }
      }
      try { (await import('../services/audit')).logEvent('generate.complete', { input, mock: false, segments: segments.length }) } catch (e) {}
      reply.raw.end()
    } catch (err: any) {
      // Audit: error
      try { (await import('../services/audit')).logEvent('generate.error', { input, error: err.message || String(err) }) } catch (e) {}
      // On error, send an event with error message and end
      try {
        reply.raw.write(`data: ${JSON.stringify({ error: err.message || String(err) })}\n\n`)
        reply.raw.end()
      } catch (e) {
        // ignore
      }
    }
  })
}

