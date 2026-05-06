import { FastifyReply, FastifyRequest } from 'fastify'
import { RoundsService } from './rounds.service'
import { createAuditLog } from '../audit/audit.service'
import { and, eq, isNull, or } from 'drizzle-orm'
import { rounds } from '../../../../db/schema'

import { db } from '../../../../db'

export class RoundsController {
  private service: RoundsService

  constructor() {
    this.service = new RoundsService()
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { scope, academicYear, status } = request.query as any
    
    // Admins see their faculty rounds + university rounds
    const data = await db.select()
      .from(rounds)
      .where(and(
        isNull(rounds.deletedAt),
        scope ? eq(rounds.scope, scope as any) : undefined,
        academicYear ? eq(rounds.academicYear, parseInt(academicYear)) : undefined,
        status ? eq(rounds.status, status as any) : undefined,
        user.role === 'admin' 
          ? or(eq(rounds.facultyId, user.facultyId), eq(rounds.scope, 'university'))
          : undefined
      ))
    
    return { data }
  }

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyFilter = user.role === 'admin' ? user.facultyId : undefined
    const data = await this.service.getRound(id, facultyFilter)
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Round not found' } })
    return { data }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const body = request.body as any
    
    const facultyId = body.scope === 'university' ? null : (user.role === 'admin' ? user.facultyId : body.facultyId)

    try {
      const data = await this.service.createRound({
        name: body.name,
        academicYear: body.academicYear,
        semester: body.semester,
        scope: body.scope,
        facultyId: body.scope === 'faculty' ? facultyId : null,
        createdById: user.userId
      }, body.websiteIds)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'round.create', 'round', data.id, null, { name: body.name, scope: body.scope })
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
      const data = await this.service.updateRound(id, scope, request.body as any, (request.body as any).websiteIds)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'round.update', 'round', id, null, request.body)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
      return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
    }
  }

  close = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      await this.service.closeRound(id, scope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'round.close', 'round', id, { status: 'active' }, { status: 'closed' })
      return { success: true }
    } catch (err: any) {
       return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
    }
  }

  listWebsites = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const data = await this.service.listWebsites(id)
    return { data }
  }
}
