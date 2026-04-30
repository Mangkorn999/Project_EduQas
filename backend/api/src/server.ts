import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie = require('@fastify/cookie')
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import csrfMiddleware from './modules/security/csrf.middleware'
import rateLimitMiddleware from './modules/security/ratelimit.middleware'
import authRoutes from './modules/auth/oauth.handler'
import { fromNodeHeaders } from 'better-auth/node'
import { psuBetterAuth } from './modules/auth/better-auth'
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

export async function buildServer() {
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'super-secret-cookie-password',
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  })

  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  })

  await server.register(csrfMiddleware)
  await server.register(rateLimitMiddleware)

  // PSU OAuth/OIDC via Better Auth (mounted under /api/auth/*)
  // We proxy all /api/auth/* requests to Better Auth's request handler.
  server.route({
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const host = request.headers.host ?? 'localhost'
      const url = new URL(request.url, `http://${host}`)
      const headers = fromNodeHeaders(request.headers as any)

      const init: RequestInit = {
        method: request.method,
        headers,
      }

      if (request.body !== undefined) {
        if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
          init.body = request.body as any
        } else {
          init.body = JSON.stringify(request.body)
        }
      }

      const req = new Request(url.toString(), init)
      const res = await psuBetterAuth.handler(req)

      reply.status(res.status)
      res.headers.forEach((value, key) => {
        reply.header(key, value)
      })

      const contentType = res.headers.get('content-type') ?? ''
      try {
        if (contentType.includes('application/json')) {
          return reply.send(await res.json())
        }
        const text = await res.text()
        return reply.send(text)
      } catch {
        return reply.send()
      }
    },
  })

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
    if (!process.env.SMTP_HOST) {
      smtpStatus = 'unconfigured'
    }

    const schedulerStatus = process.env.DISABLE_SCHEDULER ? 'disabled' : 'ok'

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
  if (!process.env.DISABLE_SCHEDULER) {
    startScheduler()
  }

  return server
}

export async function start() {
  try {
    const app = await buildServer()
    const port = Number(process.env.PORT) || 3001
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
