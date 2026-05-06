import { FastifyReply, FastifyRequest } from 'fastify'
import { listAuditLog, verifyAuditChain } from './audit.service'

export class AuditController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, entityType, from, to, page = '1', limit = '20' } = request.query as any
      const result = await listAuditLog({ userId, entityType, from, to }, Number(page), Number(limit))
      return result
    } catch (err) {
      request.log.error(err, 'audit.list failed')
      return reply.status(500).send({ error: 'Failed to load audit log', detail: String(err) })
    }
  }

  verify = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { from, to } = request.query as any
      const fromBigInt = from !== undefined ? BigInt(from) : undefined
      const toBigInt = to !== undefined ? BigInt(to) : undefined

      const result = await verifyAuditChain(fromBigInt, toBigInt)
      return result
    } catch (err) {
      request.log.error(err, 'audit.verify failed')
      return reply.status(500).send({ error: 'Failed to verify audit chain', detail: String(err) })
    }
  }
}
