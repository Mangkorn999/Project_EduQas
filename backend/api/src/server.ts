import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie = require('@fastify/cookie')
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyEnv from '@fastify/env'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import csrfMiddleware from './modules/security/csrf.middleware'
import rateLimitMiddleware from './modules/security/ratelimit.middleware'
import authRoutes from './modules/auth/oauth.handler'
import websitesRoutes from './modules/websites/websites.handler'
import roundsRoutes from './modules/rounds/rounds.handler'
import formsRoutes from './modules/forms/forms.handler'
import rankingRoutes from './modules/ranking/ranking.handler'
import dashboardRoutes from './modules/dashboard/dashboard.handler'
import responsesRoutes from './modules/responses/responses.handler'
import usersRoutes from './modules/users/users.handler'
import facultiesRoutes from './modules/faculties/faculties.handler'
import auditRoutes from './modules/audit/audit.handler'
import templatesRoutes from './modules/templates/templates.handler'
import notificationsRoutes from './modules/notifications/notifications.handler'
import assignmentsRoutes from './modules/assignments/assignments.handler'
import reportsRoutes from './modules/reports/reports.handler'
import pdpaRoutes from './modules/pdpa/pdpa.handler'
import { startScheduler } from './modules/scheduler/scheduler.module'
import { db } from '../../db'
import { sql } from 'drizzle-orm'

export const server = Fastify({
  logger: true,
  genReqId: () => crypto.randomUUID(),
})

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

// NFR-API-01/04 — unified error envelope
server.setErrorHandler((error: Error & { statusCode?: number; code?: string; details?: unknown }, request, reply) => {
  const statusCode = error.statusCode ?? 500
  const code = error.code ?? (statusCode === 422 ? 'business_rule' : statusCode === 400 ? 'validation_error' : 'internal_error')

  if (statusCode >= 500) {
    server.log.error(error)
  }

  reply.status(statusCode).send({
    error: {
      code,
      message: statusCode >= 500 ? 'Internal server error' : error.message,
      requestId: request.id,
      details: error.details,
    },
  })
})

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    DATABASE_URL: { type: 'string' },
    JWT_SECRET: { type: 'string' },
    COOKIE_SECRET: { type: 'string' },
    CORS_ORIGIN: { type: 'string', default: '*' },
    NODE_ENV: { type: 'string', default: 'development' },
    DISABLE_SCHEDULER: { type: 'string' },
    SMTP_HOST: { type: 'string' },
    SMTP_PORT: { type: 'string' },
    SMTP_USER: { type: 'string' },
    SMTP_PASS: { type: 'string' },
    SMTP_FROM: { type: 'string' },
  },
}

export async function buildServer() {
  await server.register(fastifyEnv, {
    schema,
    dotenv: true,
    data: process.env,
  })

  await server.register(cors, {
    origin: server.config.CORS_ORIGIN === '*' ? true : server.config.CORS_ORIGIN,
    credentials: true,
  })

  await server.register(cookie, {
    secret: server.config.COOKIE_SECRET,
  })

  await server.register(jwt, {
    secret: server.config.JWT_SECRET,
  })

  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  })

  await server.register(csrfMiddleware)
  await server.register(rateLimitMiddleware)

  // Auth (no /api/v1 prefix per SRS Appendix B)
  await server.register(authRoutes, { prefix: '/auth' })

  // Core API routes
  await server.register(websitesRoutes, { prefix: '/api/v1/websites' })
  await server.register(roundsRoutes, { prefix: '/api/v1/rounds' })
  await server.register(formsRoutes, { prefix: '/api/v1/forms' })
  await server.register(rankingRoutes, { prefix: '/api/v1/ranking' })
  await server.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
  await server.register(responsesRoutes, { prefix: '/api/v1' })
  await server.register(usersRoutes, { prefix: '/api/v1/users' })
  await server.register(facultiesRoutes, { prefix: '/api/v1/faculties' })
  await server.register(auditRoutes, { prefix: '/api/v1/audit-log' })
  await server.register(templatesRoutes, { prefix: '/api/v1/templates' })
  await server.register(notificationsRoutes, { prefix: '/api/v1/notifications' })
  await server.register(assignmentsRoutes, { prefix: '/api/v1' })
  await server.register(reportsRoutes, { prefix: '/api/v1/reports' })
  await server.register(pdpaRoutes, { prefix: '/api/v1/pdpa' })

  // NFR-AVAIL-08 — health check with real dependency probes
  server.get('/health', async () => {
    let dbStatus = 'ok'
    let smtpStatus = 'ok'

    try {
      await db.execute(sql`SELECT 1`)
    } catch {
      dbStatus = 'error'
    }

    // SMTP probe: just check env vars exist (no actual connection needed for liveness)
    if (!server.config.SMTP_HOST) {
      smtpStatus = 'unconfigured'
    }

    const schedulerStatus = server.config.DISABLE_SCHEDULER ? 'disabled' : 'ok'

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      smtp: smtpStatus,
      scheduler: schedulerStatus,
    }
  })

  server.get('/readyz', async (_, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return { ready: true }
    } catch {
      return reply.code(503).send({ ready: false })
    }
  })

  // Start scheduler unless disabled (e.g. in test environments)
  if (!server.config.DISABLE_SCHEDULER) {
    startScheduler()
  }

  return server
}

export async function start() {
  try {
    const app = await buildServer()
    const port = Number(app.config.PORT) || 3000
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
