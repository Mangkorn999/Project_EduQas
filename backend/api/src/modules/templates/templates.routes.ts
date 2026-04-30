import { FastifyInstance } from 'fastify'
import { TemplatesController } from './templates.controller'
import { createTemplateSchema, updateTemplateSchema, cloneTemplateSchema } from './templates.schema'

export default async function templatesRoutes(app: FastifyInstance) {
  const controller = new TemplatesController()

  app.get('/', { 
    preHandler: [app.authenticate] 
  }, controller.list)

  app.get('/:id', { 
    preHandler: [app.authenticate] 
  }, controller.get)

  app.post('/', {
    preHandler: [app.authenticate, app.authorize('template.manage.faculty')],
    schema: { body: createTemplateSchema }
  }, controller.create)

  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('template.manage.faculty')],
    schema: { body: updateTemplateSchema }
  }, controller.update)

  app.delete('/:id', {
    preHandler: [app.authenticate, app.authorize('template.manage.faculty')]
  }, controller.delete)

  app.post('/:id/deprecate', {
    preHandler: [app.authenticate, app.authorize('template.manage.faculty')]
  }, controller.deprecate)

  app.post('/:id/clone', {
    preHandler: [app.authenticate, app.authorize('template.manage.faculty')],
    schema: { body: cloneTemplateSchema }
  }, controller.clone)
}
