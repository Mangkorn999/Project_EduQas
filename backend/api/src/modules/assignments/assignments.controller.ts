import { FastifyReply, FastifyRequest } from 'fastify'
import { listAssignments, bulkAssign, deleteAssignment, previewAssignmentCount, bulkAssignByRole } from './assignments.service'

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

  // GET /api/v1/assignments/preview-count?roles=teacher,staff&facultyId=<uuid>|all
  previewCount = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roles: rolesParam, facultyId } = request.query as any
    const roles = String(rolesParam).split(',').filter(Boolean)
    if (roles.length === 0) {
      return reply.code(400).send({ error: { code: 'bad_request', message: 'roles is required' } })
    }
    const data = await previewAssignmentCount(roles, facultyId ?? 'all')
    return { data }
  }

  // POST /api/v1/assignments/bulk-by-role
  bulkByRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { roundId, websiteId, roles, facultyId } = request.body as any

    // admin cannot assign outside their own faculty
    const adminFacultyId = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await bulkAssignByRole(roundId, websiteId, roles, facultyId, adminFacultyId)
      return reply.code(201).send({ data, assigned: data.length })
    } catch (err: any) {
      if (err.message === 'forbidden') {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'ไม่มีสิทธิ์กำหนดผู้ประเมินข้ามคณะ' } })
      }
      return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
    }
  }
}
