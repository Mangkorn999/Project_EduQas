import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ResponsesService } from './responses.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { paginationSchema } from '../../utils/pagination'
import { createAuditLog } from '../audit/audit.service'

const answerSchema = z.object({
  questionId: z.string().uuid(),
  valueNumber: z.number().optional(),
  valueText: z.string().optional(),
  valueJson: z.string().optional(),
})

const answersBody = z.object({
  answers: z.array(answerSchema),
})

export default async function responsesRoutes(app: FastifyInstance) {
  const responsesService = new ResponsesService()

  app.post(
    '/forms/:formId/website-open',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { formId } = request.params as any
      const user = request.user as any
      await responsesService.logWebsiteOpen(formId, user.userId)
      return { ok: true }
    }
  )

  app.get(
    '/forms/:formId/responses',
    {
      preHandler: [authenticate, authorize(['admin', 'super_admin', 'executive'])],
      schema: {
        querystring: paginationSchema,
      },
    },
    async (request, reply) => {
      const { formId } = request.params as any
      const { page, limit } = request.query as any
      const result = await responsesService.getResponses(formId, page, limit)
      return result
    }
  )

  app.post(
    '/forms/:formId/responses',
    {
      preHandler: [authenticate, authorize(['teacher', 'staff', 'student'])],
      schema: {
        body: answersBody,
      },
    },
    async (request, reply) => {
      const { formId } = request.params as any
      const user = request.user as any
      const { answers } = request.body as any

      try {
        const data = await responsesService.upsertResponse(formId, user.userId, answers)
        // บันทึกการส่งคำตอบ
        await createAuditLog({ userId: user.userId, ip: request.ip }, 'response.submit', 'response', data.id, null, { formId })
        return reply.code(201).send({ data })
      } catch (err: any) {
        const status = err.statusCode ?? 500
        return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
      }
    }
  )

  app.get(
    '/responses/:responseId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { responseId } = request.params as any
      const user = request.user as any

      try {
        const data = await responsesService.getResponse(responseId, user.userId, user.role)
        return { data }
      } catch (err: any) {
        const status = err.statusCode ?? 500
        return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
      }
    }
  )

  app.patch(
    '/responses/:responseId',
    {
      preHandler: [authenticate, authorize(['teacher', 'staff', 'student'])],
      schema: {
        body: answersBody,
      },
    },
    async (request, reply) => {
      const { responseId } = request.params as any
      const user = request.user as any
      const { answers } = request.body as any

      try {
        const data = await responsesService.updateResponse(responseId, user.userId, answers)
        // บันทึกการแก้ไขคำตอบ
        await createAuditLog({ userId: user.userId, ip: request.ip }, 'response.update', 'response', responseId)
        return { data }
      } catch (err: any) {
        const status = err.statusCode ?? 500
        return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
      }
    }
  )
}
