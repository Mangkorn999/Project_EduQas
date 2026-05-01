import { FastifyInstance } from 'fastify'
import { AuditController } from './audit.controller'
import { listAuditQuerySchema, verifyAuditQuerySchema } from './audit.schema'

export default async function auditRoutes(app: FastifyInstance) {
  const controller = new AuditController()

  app.get('/', {
    preHandler: [app.authenticate, app.authorize('audit.view')],
    schema: { querystring: listAuditQuerySchema }
  }, controller.list)

  app.get('/verify', {
    preHandler: [app.authenticate, app.authorize('audit.view')],
    schema: { querystring: verifyAuditQuerySchema }
  }, controller.verify)
}
