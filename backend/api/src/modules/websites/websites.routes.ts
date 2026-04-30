import { FastifyInstance } from 'fastify'
import { WebsitesController } from './websites.controller'
import { createWebsiteSchema, updateWebsiteSchema } from './websites.schema'

export default async function websitesRoutes(app: FastifyInstance) {
  const controller = new WebsitesController()

  app.get('/', { 
    preHandler: [app.authenticate] 
  }, controller.list)

  app.get('/:id', { 
    preHandler: [app.authenticate] 
  }, controller.get)

  app.post('/', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')],
    schema: { body: createWebsiteSchema }
  }, controller.create)

  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')],
    schema: { body: updateWebsiteSchema }
  }, controller.update)

  app.delete('/:id', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')]
  }, controller.delete)

  app.post('/import', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.global')]
  }, controller.importXlsx)
}
