import { FastifyPluginAsync } from 'fastify'

interface Entry { count: number; windowStart: number }

const rateLimitPlugin: FastifyPluginAsync = async (fastify, opts) => {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
  const max = Number(process.env.RATE_LIMIT_MAX || 10)

  const store = new Map<string, Entry>()

  fastify.addHook('onRequest', async (request, reply) => {
    const key = (request.headers['x-api-key'] as string) || (request.ip || 'anon')
    const now = Date.now()
    const cur = store.get(key)
    if (!cur || now - cur.windowStart > windowMs) {
      store.set(key, { count: 1, windowStart: now })
      return
    }
    cur.count += 1
    if (cur.count > max) {
      reply.code(429).send({ error: 'Too Many Requests' })
    } else {
      store.set(key, cur)
    }
  })
}

export default rateLimitPlugin
