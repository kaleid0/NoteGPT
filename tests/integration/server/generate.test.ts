import tap from 'tap'
import Fastify from 'fastify'
import generateRoute from '../../../server/src/routes/generate'

async function build(opts?: Record<string, string | number>) {
  const fastify = Fastify()
  // apply env options if provided
  if (opts?.SERVER_API_TOKEN) process.env.SERVER_API_TOKEN = String(opts.SERVER_API_TOKEN)
  if (opts?.RATE_LIMIT_MAX) process.env.RATE_LIMIT_MAX = String(opts.RATE_LIMIT_MAX)
  // register middleware manualy by requiring plugins
  const auth = await import('../../../server/src/middleware/auth')
  const rate = await import('../../../server/src/middleware/rate_limit')
  await fastify.register((auth as any).default)
  await fastify.register((rate as any).default)
  await fastify.register(generateRoute, { prefix: '/v1' })
  return fastify
}

tap.test('generate returns SSE data when no OPENAI_API_KEY (mock) and no auth', async (t) => {
  delete process.env.SERVER_API_TOKEN
  const fastify = await build()
  const res = await fastify.inject({
    method: 'POST',
    url: '/v1/generate',
    payload: { input: 'this is a test' },
  })
  t.equal(res.statusCode, 200)
  t.match(res.headers['content-type'], /text\/?event-stream/)
  t.match(res.body, /data:\s*{/) // at least one data event
  await fastify.close()
})

tap.test('generate requires x-api-key when SERVER_API_TOKEN is set', async (t) => {
  process.env.SERVER_API_TOKEN = 'sekret'
  const fastify = await build({ SERVER_API_TOKEN: 'sekret' })

  // request without header should be unauthorized
  const res1 = await fastify.inject({ method: 'POST', url: '/v1/generate', payload: { input: 'hi' } })
  t.equal(res1.statusCode, 401)

  // with header should succeed
  const res2 = await fastify.inject({ method: 'POST', url: '/v1/generate', headers: { 'x-api-key': 'sekret' }, payload: { input: 'hi' } })
  t.equal(res2.statusCode, 200)
  t.match(res2.body, /data:/)

  await fastify.close()
  delete process.env.SERVER_API_TOKEN
})

tap.test('rate limit blocks after configured number of requests', async (t) => {
  process.env.RATE_LIMIT_MAX = '3'
  const fastify = await build({ RATE_LIMIT_MAX: 3 })

  // same key -> exceed
  for (let i = 0; i < 3; i++) {
    const r = await fastify.inject({ method: 'POST', url: '/v1/generate', headers: { 'x-api-key': 'rlkey' }, payload: { input: 'ping' } })
    t.equal(r.statusCode, 200, `request ${i + 1} should pass`)
  }

  const r4 = await fastify.inject({ method: 'POST', url: '/v1/generate', headers: { 'x-api-key': 'rlkey' }, payload: { input: 'ping' } })
  t.equal(r4.statusCode, 429)

  await fastify.close()
  delete process.env.RATE_LIMIT_MAX
})
