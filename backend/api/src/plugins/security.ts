import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import csrf from '@fastify/csrf-protection'

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Disable if you have complex frontend requirements, otherwise configure properly
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(csrf, {
    cookieOpts: { signed: true },
    getToken: (req) => req.headers['x-csrf-token'] as string,
  })
}

export default fp(securityPlugin, { name: 'security' })
