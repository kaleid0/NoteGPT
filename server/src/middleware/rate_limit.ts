import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

interface Entry {
  count: number
  windowStart: number
}

/** 简单的速率限制中间件
 * 根据 x-api-key 或 IP 地址限制请求频率
 * 可通过环境变量 RATE_LIMIT_WINDOW_MS 和 RATE_LIMIT_MAX 配置窗口和最大请求数
 */
const rateLimitPlugin: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
  const max = Number(process.env.RATE_LIMIT_MAX || 10)

  const store = new Map<string, Entry>()

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const key = (request.headers['x-api-key'] as string) || request.ip || 'anon'
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
