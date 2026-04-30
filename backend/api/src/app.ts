import { join } from 'path'
import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify'
import autoload from '@fastify/autoload'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import authRoutes from './modules/auth/auth.routes'
import facultiesRoutes from './modules/faculties/faculties.routes'
import usersRoutes from './modules/users/users.routes'
import websitesRoutes from './modules/websites/websites.routes'
import roundsRoutes from './modules/rounds/rounds.routes'
import formsRoutes from './modules/forms/forms.routes'
import responsesRoutes from './modules/responses/responses.routes'
import reportsRoutes from './modules/reports/reports.routes'
import auditRoutes from './modules/audit/audit.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import templatesRoutes from './modules/templates/templates.routes'
import assignmentsRoutes from './modules/assignments/assignments.routes'
import notificationsRoutes from './modules/notifications/notifications.routes'
import pdpaRoutes from './modules/pdpa/pdpa.routes'
import rankingRoutes from './modules/ranking/ranking.routes'
import { fromNodeHeaders } from 'better-auth/node'
import { psuBetterAuth } from './modules/auth/better-auth'
import sensible from '@fastify/sensible'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { env } from './config/env'

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts)

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Register Core Plugins
  await app.register(sensible)
  await app.register(cors, {
    origin: env.CORS_ORIGIN ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
  })
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  })

  // Autoload custom plugins (db, jwt, hooks, etc.)
  await app.register(autoload, {
    dir: join(__dirname, 'plugins'),
  })

  await app.register(autoload, {
    dir: join(__dirname, 'hooks'),
  })

  // Better Auth Proxy (needed for OAuth callback and internal sessions)
  app.route({
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

  // Global Error Handler for API Standardization (WP1)
  app.setErrorHandler((error: any, request, reply) => {
    // 1. Zod Validation Errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'validation_error',
          message: 'Invalid request data',
          details: error.validation
        }
      })
    }

    // 2. Custom Business Logic Errors (e.g., thrown from Services)
    if (error.message === 'not_found') {
      return reply.status(404).send({ error: { code: 'not_found', message: 'Resource not found' } })
    }
    if (error.message.includes('forbidden') || error.message.includes('Unauthorized')) {
      return reply.status(403).send({ error: { code: 'forbidden', message: error.message } })
    }

    // 3. Sensible HTTP Errors
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.name.toLowerCase().replace(/\s+/g, '_'),
          message: error.message
        }
      })
    }

    // 4. Unknown Internal Server Errors
    request.log.error(error)
    reply.status(500).send({
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred'
      }
    })
  })

  // Register Modules
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(facultiesRoutes, { prefix: '/api/v1/faculties' })
  await app.register(usersRoutes, { prefix: '/api/v1/users' })
  await app.register(websitesRoutes, { prefix: '/api/v1/websites' })
  await app.register(roundsRoutes, { prefix: '/api/v1/rounds' })
  await app.register(formsRoutes, { prefix: '/api/v1/forms' })
  await app.register(responsesRoutes, { prefix: '/api/v1' })
  await app.register(reportsRoutes, { prefix: '/api/v1/reports' })
  await app.register(auditRoutes, { prefix: '/api/v1/audit' })
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
  await app.register(templatesRoutes, { prefix: '/api/v1/templates' })
  await app.register(assignmentsRoutes, { prefix: '/api/v1' })
  await app.register(notificationsRoutes, { prefix: '/api/v1/notifications' })
  await app.register(pdpaRoutes, { prefix: '/api/v1/pdpa' })
  await app.register(rankingRoutes, { prefix: '/api/v1/ranking' })

  // For now, manually register some modules until they are moved to the new structure
  // This allows us to migrate incrementally
  // Once all are moved, we will use autoload for 'modules' as well
  
  return app
}
