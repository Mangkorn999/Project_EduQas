import { FastifyInstance } from 'fastify'
import { RoundsController } from './rounds.controller'
import { createRoundSchema, updateRoundSchema } from './rounds.schema'

export default async function roundsRoutes(app: FastifyInstance) {
  const controller = new RoundsController()

  app.get('/', { 
    preHandler: [app.authenticate] 
  }, controller.list)

  app.get('/:id', { 
    preHandler: [app.authenticate] 
  }, controller.get)

  app.post('/', {
    preHandler: [app.authenticate, app.authorize('round.create.faculty')],
    schema: { body: createRoundSchema }
  }, controller.create)

  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('round.create.faculty')],
    schema: { body: updateRoundSchema }
  }, controller.update)

  app.post('/:id/close', {
    preHandler: [app.authenticate, app.authorize('round.create.faculty')]
  }, controller.close)
}
