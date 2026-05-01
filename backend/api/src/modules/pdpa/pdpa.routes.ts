import { FastifyInstance } from 'fastify'
import { PdpaController } from './pdpa.controller'
import { submitPdpaSchema, rejectPdpaSchema } from './pdpa.schema'

export default async function pdpaRoutes(app: FastifyInstance) {
  const controller = new PdpaController()

  app.post('/requests', {
    preHandler: [app.authenticate],
    schema: { body: submitPdpaSchema }
  }, controller.submit)

  app.get('/requests', {
    preHandler: [app.authenticate, app.authorize('user.manage')]
  }, controller.list)

  app.post('/requests/:id/approve', {
    preHandler: [app.authenticate, app.authorize('user.manage')]
  }, controller.approve)

  app.post('/requests/:id/reject', {
    preHandler: [app.authenticate, app.authorize('user.manage')],
    schema: { body: rejectPdpaSchema }
  }, controller.reject)
}
