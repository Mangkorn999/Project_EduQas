import { FastifyInstance } from 'fastify'
import { UsersController } from './users.controller'
import { createUserSchema, updateUserSchema } from './users.schema'

export default async function usersRoutes(app: FastifyInstance) {
  const controller = new UsersController(app)

  app.get('/', { 
    preHandler: [app.authenticate, app.authorize('user.manage')] 
  }, controller.list)

  app.post('/', {
    preHandler: [app.authenticate, app.authorize('user.manage')],
    schema: { body: createUserSchema }
  }, controller.create)

  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('user.manage')],
    schema: { body: updateUserSchema }
  }, controller.update)

  app.delete('/:id', {
    preHandler: [app.authenticate, app.authorize('user.manage')]
  }, controller.delete)

  app.post('/import', {
    preHandler: [app.authenticate, app.authorize('user.manage')]
  }, controller.importXlsx)
}
