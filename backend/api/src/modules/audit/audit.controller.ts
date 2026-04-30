import { FastifyReply, FastifyRequest } from 'fastify'
import { listAuditLog, verifyAuditChain } from './audit.service'

export class AuditController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, entityType, from, to, page, limit } = request.query as any
    const result = await listAuditLog({ userId, entityType, from, to }, page, limit)
    return result
  }

  verify = async (request: FastifyRequest, reply: FastifyReply) => {
    const { from, to } = request.query as any
    const fromBigInt = from !== undefined ? BigInt(from) : undefined
    const toBigInt = to !== undefined ? BigInt(to) : undefined

    const result = await verifyAuditChain(fromBigInt, toBigInt)
    return result
  }
}
