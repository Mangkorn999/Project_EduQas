import { FastifyInstance } from 'fastify'
import fastifyRateLimit from '@fastify/rate-limit'

export default async function rateLimitMiddleware(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    max: 100, // Global limit
    timeWindow: '1 minute',
  })
}
