import { FastifyReply, FastifyRequest } from 'fastify'
import { ResponsesService } from './responses.service'
import { paginationSchema } from '../../utils/pagination'
import { createAuditLog } from '../audit/audit.service'

export class ResponsesController {
  private service: ResponsesService

  constructor() {
    this.service = new ResponsesService()
  }

  logWebsiteOpen = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as any
    const user = request.user as any
    await this.service.logWebsiteOpen(formId, user)
    return { ok: true }
  }

  getResponses = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as any
    const { page, limit } = request.query as any
    const user = request.user as any
    const result = await this.service.getResponses(formId, page, limit, user)
    return result
  }

  upsertResponse = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as any
    const user = request.user as any
    const { answers } = request.body as any

    try {
      const data = await this.service.upsertResponse(formId, user, answers)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'response.submit', 'response', data.id, null, { formId })
      return reply.code(201).send({ data })
    } catch (err: any) {
      const status = err.statusCode ?? 500
      return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
    }
  }

  getResponse = async (request: FastifyRequest, reply: FastifyReply) => {
    const { responseId } = request.params as any
    const user = request.user as any

    try {
      const data = await this.service.getResponse(responseId, user)
      return { data }
    } catch (err: any) {
      const status = err.statusCode ?? 500
      return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
    }
  }

  updateResponse = async (request: FastifyRequest, reply: FastifyReply) => {
    const { responseId } = request.params as any
    const user = request.user as any
    const { answers } = request.body as any

    try {
      const data = await this.service.updateResponse(responseId, user, answers)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'response.update', 'response', responseId)
      return { data }
    } catch (err: any) {
      const status = err.statusCode ?? 500
      return reply.code(status).send({ error: { code: err.code ?? 'error', message: err.message } })
    }
  }
}
