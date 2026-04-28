import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { listAuditLog, verifyAuditChain } from './audit.service'
import { paginationSchema } from '../../utils/pagination'

export default async function auditRoutes(app: FastifyInstance) {
  const superAdminOnly = [authenticate, authorize(['super_admin'])]

  app.get('/', { preHandler: superAdminOnly }, async (request, reply) => {
    const querySchema = paginationSchema.extend({
      userId: z.string().optional(),
      entityType: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: { code: 'validation_error', message: parsed.error.message } })
    }

    const { userId, entityType, from, to, page, limit } = parsed.data
    const result = await listAuditLog({ userId, entityType, from, to }, page, limit)
    return result
  })

  app.get('/verify', { preHandler: superAdminOnly }, async (request, reply) => {
    const querySchema = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: { code: 'validation_error', message: parsed.error.message } })
    }

    const fromBigInt = parsed.data.from !== undefined ? BigInt(parsed.data.from) : undefined
    const toBigInt = parsed.data.to !== undefined ? BigInt(parsed.data.to) : undefined

    const result = await verifyAuditChain(fromBigInt, toBigInt)
    return result
  })
}
