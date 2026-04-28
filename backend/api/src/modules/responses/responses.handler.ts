/**
 * Responses Handler
 *
 * Endpoints ตาม api-contracts.md §6:
 * - GET  /api/v1/forms/:formId/responses  → list responses
 * - POST /api/v1/forms/:formId/responses  → create/upsert response
 * - GET  /api/v1/responses/:id            → read single
 * - PATCH /api/v1/responses/:id           → update answers
 * - POST /api/v1/responses/:id/submit     → submit response
 * - POST /api/v1/forms/:formId/website-open → log websiteOpenedAt
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ResponsesService } from './responses.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { sendError } from '../../lib/errors'

export default async function responsesRoutes(app: FastifyInstance) {
  const service = new ResponsesService()

  // ─── Form-scoped Routes (mount under /api/v1/forms/:formId/*) ───────────────

  app.get('/forms/:formId/responses', {
    preHandler: [authenticate, authorize(['super_admin', 'admin', 'executive'])],
  }, async (request, reply) => {
    const { formId } = request.params as any
    const { userId } = request.query as any

    const data = await service.listByFormId(formId, userId)
    return { data }
  })

  app.post('/forms/:formId/responses', {
    preHandler: [authenticate],
    schema: {
      body: z.object({
        formOpenedAt: z.string().optional(),
        websiteOpenedAt: z.string().optional(),
        answers: z.array(z.object({
          questionId: z.string().uuid(),
          valueNumber: z.number().optional(),
          valueText: z.string().optional(),
          valueJson: z.string().optional(),
        })),
      }),
    },
  }, async (request, reply) => {
    const { formId } = request.params as any
    const user = request.user as any

    try {
      const data = await service.createOrUpsert(formId, user.userId, request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'form_not_found') return sendError(reply, 404, 'not_found', 'Form not found')
      if (err.message === 'form_not_open') return sendError(reply, 422, 'business_rule', 'Form is not open for responses')
      if (err.message === 'already_submitted') return sendError(reply, 409, 'conflict', 'Response already submitted')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  // FR-EVAL-03: log websiteOpenedAt
  app.post('/forms/:formId/website-open', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { formId } = request.params as any
    const user = request.user as any

    try {
      const data = await service.logWebsiteOpen(formId, user.userId)
      return { data }
    } catch (err: any) {
      if (err.message === 'form_not_found') return sendError(reply, 404, 'not_found', 'Form not found')
      if (err.message === 'form_not_open') return sendError(reply, 422, 'business_rule', 'Form is not open')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  // ─── Response-scoped Routes (mount under /api/v1/responses/*) ──────────────

  app.get('/responses/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const data = await service.getById(id)
    if (!data) return sendError(reply, 404, 'not_found', 'Response not found')
    return { data }
  })

  app.patch('/responses/:id', {
    preHandler: [authenticate],
    schema: {
      body: z.object({
        answers: z.array(z.object({
          questionId: z.string().uuid(),
          valueNumber: z.number().optional(),
          valueText: z.string().optional(),
          valueJson: z.string().optional(),
        })),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const body = request.body as any

    try {
      const data = await service.updateAnswers(id, user.userId, body.answers)
      return { data }
    } catch (err: any) {
      if (err.message === 'response_not_found') return sendError(reply, 404, 'not_found', 'Response not found')
      if (err.message === 'forbidden') return sendError(reply, 403, 'forbidden', 'Not your response')
      if (err.message === 'already_submitted') return sendError(reply, 409, 'conflict', 'Cannot edit submitted response')
      if (err.message === 'form_not_open') return sendError(reply, 422, 'business_rule', 'Form is no longer open')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  // POST /responses/:id/submit — FR-EVAL-06
  app.post('/responses/:id/submit', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any

    try {
      const data = await service.submitResponse(id, user.userId)
      return { data }
    } catch (err: any) {
      if (err.message === 'response_not_found') return sendError(reply, 404, 'not_found', 'Response not found')
      if (err.message === 'forbidden') return sendError(reply, 403, 'forbidden', 'Not your response')
      if (err.message === 'already_submitted') return sendError(reply, 409, 'conflict', 'Already submitted')
      if (err.message === 'form_not_open') return sendError(reply, 422, 'business_rule', 'Form is closed')
      // FR-EVAL-06: ต้องเปิดเว็บก่อน submit
      if (err.message === 'website_not_opened') return sendError(reply, 422, 'business_rule', 'Please open the website before submitting')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })
}
