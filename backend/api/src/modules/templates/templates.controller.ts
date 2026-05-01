import { FastifyReply, FastifyRequest } from 'fastify'
import { TemplatesService } from './templates.service'
import { paginationSchema } from '../../utils/pagination'
import { createAuditLog } from '../audit/audit.service'

export class TemplatesController {
  private service: TemplatesService

  constructor() {
    this.service = new TemplatesService()
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any
    const { page, limit } = paginationSchema.parse(query)
    const filters = {
      scope: query.scope as string | undefined,
      facultyId: query.facultyId as string | undefined,
      includeDeprecated: query.includeDeprecated === 'true',
    }
    const result = await this.service.listTemplates(filters, page, limit)
    return result
  }

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    try {
      const data = await this.service.getTemplate(id)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      throw err
    }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const body = request.body as any
    const ownerFacultyId = user.role === 'admin' ? user.facultyId : (body.ownerFacultyId ?? user.facultyId)

    try {
      const data = await this.service.createTemplate({ title: body.title, scope: body.scope, ownerFacultyId, ownerUserId: user.userId })
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'template.create', 'template', data.id, null, { title: body.title, scope: body.scope })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    try {
      const existing = await this.service.getTemplate(id)
      if (user.role === 'admin' && existing.ownerFacultyId !== user.facultyId) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
      }
      const data = await this.service.updateTemplate(id, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    try {
      const existing = await this.service.getTemplate(id)
      if (user.role === 'admin' && existing.ownerFacultyId !== user.facultyId) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
      }
      await this.service.softDeleteTemplate(id)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'template.delete', 'template', id)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      throw err
    }
  }

  deprecate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    try {
      const existing = await this.service.getTemplate(id)
      if (user.role === 'admin' && existing.ownerFacultyId !== user.facultyId) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
      }
      const data = await this.service.deprecateTemplate(id)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'template.deprecate', 'template', id, { isDeprecated: false }, { isDeprecated: true })
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      throw err
    }
  }

  clone = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const body = request.body as any
    const targetFacultyId = user.role === 'admin' ? user.facultyId : body.targetFacultyId
    try {
      const data = await this.service.cloneTemplate(id, targetFacultyId, user.userId, user.role)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      throw err
    }
  }
}
