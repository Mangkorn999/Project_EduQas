import { FastifyInstance } from 'fastify'
import { ResponsesController } from './responses.controller'
import { answersBodySchema, formIdParamsSchema, responseIdParamsSchema } from './responses.schema'
import { paginationSchema } from '../../utils/pagination'

export default async function responsesRoutes(app: FastifyInstance) {
  const controller = new ResponsesController()

  app.post('/forms/:formId/website-open', { 
    preHandler: [app.authenticate],
    schema: { params: formIdParamsSchema },
  }, controller.logWebsiteOpen)

  app.get('/forms/:formId/responses', {
    preHandler: [app.authenticate, app.authorize('dashboard.faculty')],
    schema: { params: formIdParamsSchema, querystring: paginationSchema }
  }, controller.getResponses)

  app.post('/forms/:formId/responses', {
    preHandler: [app.authenticate, app.authorize('evaluate.assigned')],
    schema: { params: formIdParamsSchema, body: answersBodySchema }
  }, controller.upsertResponse)

  app.get('/responses/:responseId', { 
    preHandler: [app.authenticate],
    schema: { params: responseIdParamsSchema },
  }, controller.getResponse)

  app.patch('/responses/:responseId', {
    preHandler: [app.authenticate, app.authorize('evaluate.assigned')],
    schema: { params: responseIdParamsSchema, body: answersBodySchema }
  }, controller.updateResponse)
}
