import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import generateRoute from './routes/generate'
import syncRoute from './routes/sync'
import authPlugin from './middleware/auth'
import rateLimitPlugin from './middleware/rate_limit'
import { closeDatabase } from './services/database'

const server = Fastify({ logger: true })

// Register WebSocket plugin first (before other plugins)
server.register(fastifyWebsocket)

// Register sync route (uses its own auth via query params for WebSocket)
server.register(syncRoute, { prefix: '/v1' })

// Register security middleware for HTTP routes
server.register(authPlugin)
server.register(rateLimitPlugin)

server.register(generateRoute, { prefix: '/v1' })

// Graceful shutdown
const shutdown = async () => {
  server.log.info('Shutting down...')
  await server.close()
  closeDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

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
