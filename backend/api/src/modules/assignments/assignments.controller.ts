import { FastifyReply, FastifyRequest } from 'fastify'
import { listAssignments, bulkAssign, deleteAssignment } from './assignments.service'

export class AssignmentsController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId } = request.params as any
    const data = await listAssignments(roundId)
    return { data }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId } = request.params as any
    const { assignments } = request.body as any
    const data = await bulkAssign(roundId, assignments)
    return reply.code(201).send({ data })
  }

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { assignmentId } = request.params as any
    try {
      await deleteAssignment(assignmentId)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Assignment not found' } })
      return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
    }
  }
}
