import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { listAssignments, bulkAssign, deleteAssignment } from './assignments.service'

export default async function assignmentsRoutes(app: FastifyInstance) {
  app.get(
    '/rounds/:roundId/assignments',
    { preHandler: [authenticate, authorize(['admin', 'super_admin'])] },
    async (request, reply) => {
      const { roundId } = request.params as any
      const data = await listAssignments(roundId)
      return { data }
    },
  )

  app.post(
    '/rounds/:roundId/assignments',
    {
      preHandler: [authenticate, authorize(['admin', 'super_admin'])],
      schema: {
        body: z.object({
          assignments: z.array(
            z.object({
              userId: z.string().uuid(),
              websiteId: z.string().uuid(),
            }),
          ).min(1),
        }),
      },
    },
    async (request, reply) => {
      const { roundId } = request.params as any
      const { assignments } = request.body as { assignments: Array<{ userId: string; websiteId: string }> }

      const data = await bulkAssign(roundId, assignments)
      return reply.code(201).send({ data })
    },
  )

  app.delete(
    '/rounds/:roundId/assignments/:assignmentId',
    { preHandler: [authenticate, authorize(['admin', 'super_admin'])] },
    async (request, reply) => {
      const { assignmentId } = request.params as any

      try {
        await deleteAssignment(assignmentId)
        return { success: true }
      } catch (err: any) {
        if (err.message === 'not_found') {
          return reply.code(404).send({ error: { code: 'not_found', message: 'Assignment not found' } })
        }
        return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
      }
    },
  )
}
