import tap from 'tap'
import Fastify from 'fastify'
import generateRoute from '../../../server/src/routes/generate'

async function build() {
  const fastify = Fastify()
  const auth = await import('../../../server/src/middleware/auth')
  const rate = await import('../../../server/src/middleware/rate_limit')
  await fastify.register((auth as any).default)
  await fastify.register((rate as any).default)
  await fastify.register(generateRoute, { prefix: '/v1' })
  return fastify
}

tap.test('audit logs are recorded for generate', async (t) => {
  const fastify = await build()
  const audit = await import('../../../server/src/services/audit')
  audit.clearEvents()

  const res = await fastify.inject({ method: 'POST', url: '/v1/generate', payload: { input: 'audit-test' } })
  t.equal(res.statusCode, 200)

  const events = audit.getEvents()
  t.ok(events.find((e: any) => e.type === 'generate.request'))
  t.ok(events.find((e: any) => e.type === 'generate.complete'))

  await fastify.close()
})