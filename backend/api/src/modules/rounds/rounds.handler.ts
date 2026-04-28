import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { RoundsService } from './rounds.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

export default async function roundsRoutes(app: FastifyInstance) {
  const service = new RoundsService()

  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as any
    const { scope, academicYear, status } = request.query as any
    
    // Admin sees only their faculty or university scope (since they can view uni rounds).
    // Actually, dashboard filters by scope. For creation/editing, scope applies.
    const facultyFilter = user.role === 'admin' ? user.facultyId : undefined
    
    const data = await service.listRounds(scope, facultyFilter, academicYear ? parseInt(academicYear) : undefined, status)
    return { data }
  })

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    
    const facultyFilter = user.role === 'admin' ? user.facultyId : undefined
    const data = await service.getRound(id, facultyFilter)
    
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Round not found' } })
    return { data }
  })

  app.post(
    '/',
    { 
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: { 
        body: z.object({ 
          name: z.string(), 
          academicYear: z.number(), 
          semester: z.number(), 
          scope: z.enum(['faculty', 'university']),
          facultyId: z.string().optional(),
          websiteIds: z.array(z.string()).optional()
        }) 
      }
    },
    async (request, reply) => {
      const user = request.user as any
      const body = request.body as any

      if (user.role === 'admin' && body.scope === 'university') {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Admin cannot create university rounds' } })
      }
      
      const facultyId = user.role === 'admin' ? user.facultyId : body.facultyId

      try {
        const data = await service.createRound({
          name: body.name,
          academicYear: body.academicYear,
          semester: body.semester,
          scope: body.scope,
          facultyId: body.scope === 'faculty' ? facultyId : null,
          createdById: user.userId
        }, body.websiteIds)
        return reply.code(201).send({ data })
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.patch(
    '/:id',
    { 
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: { 
        body: z.object({ 
          name: z.string().optional(), 
          academicYear: z.number().optional(), 
          semester: z.number().optional(), 
          status: z.enum(['draft', 'active', 'closed']).optional(),
          websiteIds: z.array(z.string()).optional()
        }) 
      }
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const scope = user.role === 'admin' ? user.facultyId : undefined
      
      try {
        const data = await service.updateRound(id, scope, request.body as any, (request.body as any).websiteIds)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
        return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
      }
    }
  )

  app.post('/:id/close', { preHandler: [authenticate, authorize(['super_admin', 'admin'])] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      await service.closeRound(id, scope)
      return { success: true }
    } catch (err: any) {
       return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
    }
  })
}
