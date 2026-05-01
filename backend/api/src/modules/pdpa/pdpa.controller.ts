import { FastifyReply, FastifyRequest } from 'fastify'
import { submitPdpaRequest, listPdpaRequests, approvePdpaRequest, rejectPdpaRequest } from './pdpa.service'
import { createAuditLog } from '../audit/audit.service'

export class PdpaController {
  submit = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { reason } = request.body as any
    try {
      const data = await submitPdpaRequest(user.userId, reason)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'pdpa.submit', 'pdpa_request', data.id, null, { reason })
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'pending_request_exists') return reply.code(409).send({ error: { code: 'conflict', message: 'A pending request already exists' } })
      return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
    }
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '20' } = request.query as any
    const data = await listPdpaRequests(Number(page), Number(limit))
    return data
  }

  approve = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    try {
      const data = await approvePdpaRequest(id, user.userId)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'pdpa.approve', 'pdpa_request', id, { status: 'pending' }, { status: 'approved' })
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Request not found' } })
      if (err.message === 'invalid_status') return reply.code(409).send({ error: { code: 'conflict', message: 'Request is not in pending status' } })
      return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
    }
  }

  reject = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const { reason } = request.body as any
    try {
      const data = await rejectPdpaRequest(id, user.userId, reason)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'pdpa.reject', 'pdpa_request', id, { status: 'pending' }, { status: 'rejected', reason })
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Request not found' } })
      if (err.message === 'invalid_status') return reply.code(409).send({ error: { code: 'conflict', message: 'Request is not in pending status' } })
      return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
    }
  }
}
