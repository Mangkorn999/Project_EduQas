import { FastifyReply, FastifyRequest } from 'fastify'
import { WebsitesService } from './websites.service'
import { createAuditLog } from '../audit/audit.service'

export class WebsitesController {
  private service: WebsitesService

  constructor() {
    this.service = new WebsitesService()
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { urlStatus, q } = request.query as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    const data = await this.service.listWebsites(scope, urlStatus, q)
    return { data }
  }

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    const data = await this.service.getWebsite(id, scope)
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Website not found' } })
    return { data }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const body = request.body as any
    // admin คณะ → บังคับเป็น facultyId ของตัวเอง, super_admin → ใช้ค่าที่เลือกหรือ null
    const ownerFacultyId = user.role === 'admin' ? user.facultyId : (body.ownerFacultyId || null)
    try {
      const data = await this.service.createWebsite({ ...body, ownerFacultyId })
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'website.create', 'website', data.id, null, { name: body.name, url: body.url })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    try {
      const data = await this.service.updateWebsite(id, scope, request.body as any)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'website.update', 'website', id, null, request.body)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    try {
      await this.service.softDeleteWebsite(id, scope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'website.delete', 'website', id)
      return { success: true }
    } catch (err: any) {
       return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
    }
  }

  importXlsx = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: { code: 'validation_error', message: 'No file uploaded' } })

    const chunks: Uint8Array[] = []
    for await (const chunk of data.file) { chunks.push(chunk as Uint8Array) }
    const buffer = Buffer.concat(chunks)

    try {
      const result = await this.service.importWebsitesXlsx(buffer)
      return { data: result }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
    }
  }
}
