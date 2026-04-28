import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import {
  submitPdpaRequest,
  listPdpaRequests,
  approvePdpaRequest,
  rejectPdpaRequest,
} from './pdpa.service'

export default async function pdpaRoutes(app: FastifyInstance) {
  app.post(
    '/requests',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as any
      const body = request.body as any
      const reason: string | undefined = body?.reason

      try {
        const data = await submitPdpaRequest(user.sub, reason)
        return reply.code(201).send({ data })
      } catch (err: any) {
        if (err.message === 'pending_request_exists') {
          return reply.code(409).send({ error: { code: 'conflict', message: 'A pending request already exists' } })
        }
        return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
      }
    },
  )

  app.get(
    '/requests',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const { page = '1', limit = '20' } = request.query as any
      const data = await listPdpaRequests(Number(page), Number(limit))
      return data
    },
  )

  app.post(
    '/requests/:id/approve',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any

      try {
        const data = await approvePdpaRequest(id, user.sub)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Request not found' } })
        if (err.message === 'invalid_status') return reply.code(409).send({ error: { code: 'conflict', message: 'Request is not in pending status' } })
        return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
      }
    },
  )

  app.post(
    '/requests/:id/reject',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: { body: z.object({ reason: z.string().min(1) }) },
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const { reason } = request.body as { reason: string }

      try {
        const data = await rejectPdpaRequest(id, user.sub, reason)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Request not found' } })
        if (err.message === 'invalid_status') return reply.code(409).send({ error: { code: 'conflict', message: 'Request is not in pending status' } })
        return reply.code(400).send({ error: { code: 'bad_request', message: err.message } })
      }
    },
  )
}
