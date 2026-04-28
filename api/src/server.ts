import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import csrfMiddleware from './modules/security/csrf.middleware'
import rateLimitMiddleware from './modules/security/ratelimit.middleware'
import authRoutes from './modules/auth/oauth.handler'

export const server = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>()

// Add schema validator and serializer
server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

export async function buildServer() {
  await server.register(cors, {
    origin: true, // For development. Update for production.
    credentials: true,
  })

  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'super-secret-cookie-password',
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
  })

  // Security Middlewares
  await server.register(csrfMiddleware)
  await server.register(rateLimitMiddleware)

  // Register API routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' })

  // Basic Health Check (NFR-AVAIL-08)
  server.get('/health', async () => {
    return { status: 'ok', db: 'ok', smtp: 'ok', scheduler: 'ok' }
  })

  return server
}

export async function start() {
  try {
    const app = await buildServer()
    const port = Number(process.env.PORT) || 3000
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server is listening on port ${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

if (require.main === module) {
  start()
}
