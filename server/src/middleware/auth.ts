import { FastifyPluginAsync } from 'fastify'

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const serverToken = process.env.SERVER_API_TOKEN
  if (!serverToken) return

  fastify.addHook('onRequest', async (request, reply) => {
    const clientToken = (request.headers['x-api-key'] as string) || ''
    if (clientToken !== serverToken) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export default authPlugin
