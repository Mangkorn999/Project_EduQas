import { FastifyInstance } from 'fastify'
import { AssignmentsController } from './assignments.controller'
import { bulkAssignSchema, bulkAssignByRoleSchema } from './assignments.schema'

export default async function assignmentsRoutes(app: FastifyInstance) {
  const controller = new AssignmentsController()

  app.get(
    '/rounds/:roundId/assignments',
    { preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')] },
    controller.list
  )

  app.post(
    '/rounds/:roundId/assignments',
    {
      preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')],
      schema: { body: bulkAssignSchema }
    },
    controller.create
  )

  app.delete(
    '/rounds/:roundId/assignments/:assignmentId',
    { preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')] },
    controller.delete
  )

  // Preview how many users will be assigned before confirming
  app.get(
    '/assignments/preview-count',
    { preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')] },
    controller.previewCount
  )

  // Assign evaluators by role + faculty (used by AssignmentDialog)
  app.post(
    '/assignments/bulk-by-role',
    {
      preHandler: [app.authenticate, app.authorize('website_target.manage.faculty')],
      schema: { body: bulkAssignByRoleSchema }
    },
    controller.bulkByRole
  )
}
