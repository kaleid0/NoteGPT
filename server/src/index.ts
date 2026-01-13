import Fastify from 'fastify'
import generateRoute from './routes/generate'
import authPlugin from './middleware/auth'
import rateLimitPlugin from './middleware/rate_limit'

const server = Fastify({ logger: true })

// Register security middleware first
server.register(authPlugin)
server.register(rateLimitPlugin)

server.register(generateRoute, { prefix: '/v1' })

const start = async () => {
  try {
    await server.listen({ port: 4000 })
    server.log.info('Server listening on 4000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
