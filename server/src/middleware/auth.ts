import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

/** 简单的 API Token 验证中间件
 * 如果.env 文件中设置了 SERVER_API_TOKEN，则会验证请求头中的 x-api-key 是否匹配
 */
const authPlugin: FastifyPluginAsync = async (fastify): Promise<void> => {
  const serverToken = process.env.SERVER_API_TOKEN
  if (!serverToken) return

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientToken = (request.headers['x-api-key'] as string) || ''
    if (clientToken !== serverToken) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export default authPlugin
