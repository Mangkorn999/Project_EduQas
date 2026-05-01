import { FastifyInstance } from 'fastify'
import { FacultiesController } from './faculties.controller'
import { createFacultySchema, updateFacultySchema } from './faculties.schema'

export default async function facultiesRoutes(app: FastifyInstance) {
  const controller = new FacultiesController()

  app.get('/', { 
    preHandler: [app.authenticate] 
  }, controller.list)

  app.post('/', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.global')],
    schema: { body: createFacultySchema }
  }, controller.create)

  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.global')],
    schema: { body: updateFacultySchema }
  }, controller.update)
}
