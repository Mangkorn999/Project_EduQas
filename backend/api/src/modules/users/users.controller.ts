import { FastifyReply, FastifyRequest } from 'fastify'
import { UsersService } from './users.service'
import { TokenService } from '../auth/token.service'
import { SessionService } from '../auth/session.service'
import { paginationSchema, paginatedResponse } from '../../utils/pagination'
import { createAuditLog } from '../audit/audit.service'

export class UsersController {
  private service: UsersService
  private sessionService: SessionService

  constructor(app: any) {
    this.service = new UsersService()
    const tokenService = new TokenService(app)
    this.sessionService = new SessionService(tokenService)
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any
    const { page, limit } = paginationSchema.parse(query)
    const { role, facultyId, status } = query

    const { data, total } = await this.service.listUsers({ role, facultyId, status }, page, limit)
    return paginatedResponse(data, total, page, limit)
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any
    try {
      const user = await this.service.createUser(body)
      const requestUser = request.user as any
      await createAuditLog({ userId: requestUser.userId, ip: request.ip }, 'user.create', 'user', user.id, null, { email: body.email, role: body.role })
      return reply.code(201).send({ data: user })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const body = request.body as any

    try {
      const { user, needsRevoke, userId } = await this.service.updateUser(id, body)
      if (needsRevoke) {
        await this.sessionService.revokeAll(userId)
      }
      const requestUser = request.user as any
      await createAuditLog({ userId: requestUser.userId, ip: request.ip }, 'user.update', 'user', id, null, body)
      return { data: user }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    try {
      const { userId } = await this.service.softDeleteUser(id)
      await this.sessionService.revokeAll(userId)
      const requestUser = request.user as any
      await createAuditLog({ userId: requestUser.userId, ip: request.ip }, 'user.delete', 'user', id)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  importXlsx = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: { code: 'validation_error', message: 'No file uploaded' } })

    const chunks: Uint8Array[] = []
    for await (const chunk of data.file) { chunks.push(chunk as Uint8Array) }
    const buffer = Buffer.concat(chunks)

    try {
      const result = await this.service.importUsersXlsx(buffer)
      return { data: result }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
    }
  }
}
